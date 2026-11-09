/*
 * Audit adapter for the locally built daemon's native Sapling primitives.
 * This is test tooling, not an SDK crypto implementation or Mobile adapter.
 *
 * cc -O2 -I../VerusCoin/depends/aarch64-apple-darwin/include \
 *   debug/identityUploadDaemonCrypto.c \
 *   ../VerusCoin/depends/aarch64-apple-darwin/lib/librustzcash.a \
 *   ../VerusCoin/depends/aarch64-apple-darwin/lib/libsodium.a \
 *   -framework Security -framework CoreFoundation -o /tmp/local-upload-native-crypto
 *
 * encrypt <43-byte-payment-address-hex> <plaintext-hex> [temporary-ssk]
 * decrypt <ivk-hex> <epk-hex> <ciphertext-hex>
 * decrypt-ssk <ssk-hex> <ciphertext-hex>
 * recipient (fresh publishable IVK/address; spending material is discarded)
 * Data is synthetic; do not use command-line arguments for wallet secrets.
 */
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sodium.h>

/* The daemon header is C++-only, while these exported functions have a C ABI. */
extern bool librustzcash_sapling_ka_agree(
    const unsigned char *, const unsigned char *, unsigned char *);
extern bool librustzcash_sapling_ka_derivepublic(
    const unsigned char *, const unsigned char *, unsigned char *);
extern void librustzcash_sapling_generate_r(unsigned char *);
extern void librustzcash_ask_to_ak(const unsigned char *, unsigned char *);
extern void librustzcash_nsk_to_nk(const unsigned char *, unsigned char *);
extern void librustzcash_crh_ivk(
    const unsigned char *, const unsigned char *, unsigned char *);
extern bool librustzcash_check_diversifier(const unsigned char *);
extern bool librustzcash_ivk_to_pkd(
    const unsigned char *, const unsigned char *, unsigned char *);

static unsigned char *unhex(const char *value, size_t *length) {
    size_t size = strlen(value);
    unsigned char *result = malloc(size / 2 + 1);

    if (!result || size % 2 || sodium_hex2bin(result, size / 2, value, size,
                                           NULL, length, NULL) != 0) {
        fprintf(stderr, "Invalid hex input\n");
        exit(2);
    }

    return result;
}

static void hex(const unsigned char *value, size_t length) {
    for (size_t i = 0; i < length; i++) printf("%02x", value[i]);
}

/* Match the daemon's Sapling KDF: shared secret followed by the ephemeral key. */
static void derive_key(unsigned char *key, const unsigned char *shared,
                       const unsigned char *epk) {
    unsigned char input[64], personal[16] = "Zcash_SaplingKDF";

    memcpy(input, shared, 32);
    memcpy(input + 32, epk, 32);

    if (crypto_generichash_blake2b_salt_personal(key, 32, input, 64,
                                               NULL, 0, NULL, personal))
        exit(3);
}

int main(int argc, char **argv) {
    /* Fresh ephemeral keys make the daemon's fixed nonce safe for each payload. */
    unsigned char key[32], shared[32], nonce[12] = {0};

    if (sodium_init() < 0 || argc < 2) return 2;

    if (!strcmp(argv[1], "recipient") && argc == 2) {
        unsigned char ask[32], nsk[32], ak[32], nk[32], ivk[32], address[43];

        librustzcash_sapling_generate_r(ask);
        librustzcash_sapling_generate_r(nsk);
        librustzcash_ask_to_ak(ask, ak);
        librustzcash_nsk_to_nk(nsk, nk);
        librustzcash_crh_ivk(ak, nk, ivk);

        /* A payment address is an 11-byte diversifier plus its 32-byte key. */
        do {
            randombytes_buf(address, 11);
        } while (!librustzcash_check_diversifier(address));

        if (!librustzcash_ivk_to_pkd(ivk, address, address + 11)) return 3;

        printf("{\"addressBytes\":\"");
        hex(address, 43);
        printf("\",\"ivk\":\"");
        hex(ivk, 32);
        puts("\"}");

        /* Return only the disposable recipient and viewing key to the tests. */
        sodium_memzero(ask, sizeof(ask));
        sodium_memzero(nsk, sizeof(nsk));
        sodium_memzero(ivk, sizeof(ivk));
    } else if (!strcmp(argv[1], "encrypt") && (argc == 4 || argc == 5)) {
        size_t address_len, plaintext_len;
        unsigned char *address = unhex(argv[2], &address_len);
        unsigned char *plaintext = unhex(argv[3], &plaintext_len);
        unsigned char esk[32], epk[32];
        unsigned char *ciphertext = malloc(plaintext_len + 16);

        if (address_len != 43 || !ciphertext) return 2;

        librustzcash_sapling_generate_r(esk);

        if (!librustzcash_sapling_ka_derivepublic(address, esk, epk) ||
            !librustzcash_sapling_ka_agree(address + 11, esk, shared))
            return 3;

        derive_key(key, shared, epk);

        /* The daemon appends the 16-byte authentication tag to the ciphertext. */
        unsigned long long ciphertext_len;

        if (crypto_aead_chacha20poly1305_ietf_encrypt(ciphertext, &ciphertext_len,
            plaintext, plaintext_len, NULL, 0, NULL, nonce, key))
            return 3;

        printf("{\"epk\":\"");
        hex(epk, 32);
        printf("\",\"ciphertext\":\"");
        hex(ciphertext, ciphertext_len);

        if (argc == 5 && !strcmp(argv[4], "temporary-ssk")) {
            printf("\",\"ssk\":\"");
            hex(key, 32);
        }

        puts("\"}");

        sodium_memzero(esk, sizeof(esk));
        free(address);
        free(plaintext);
        free(ciphertext);
    } else if (!strcmp(argv[1], "decrypt-ssk") && argc == 4) {
        size_t key_len, ciphertext_len;
        unsigned char *ssk = unhex(argv[2], &key_len);
        unsigned char *ciphertext = unhex(argv[3], &ciphertext_len);
        unsigned char *plaintext = malloc(ciphertext_len + 1);

        if (key_len != 32 || ciphertext_len < 16 || !plaintext) return 2;

        /* Authenticate with the sender's temporary key without requiring an IVK. */
        unsigned long long plaintext_len;

        if (crypto_aead_chacha20poly1305_ietf_decrypt(plaintext, &plaintext_len,
            NULL, ciphertext, ciphertext_len, NULL, 0, nonce, ssk))
            return 4;

        hex(plaintext, plaintext_len);
        puts("");

        sodium_memzero(ssk, key_len);
        sodium_memzero(plaintext, plaintext_len);
        free(ssk);
        free(ciphertext);
        free(plaintext);
    } else if (!strcmp(argv[1], "decrypt") && argc == 5) {
        size_t ivk_len, epk_len, ciphertext_len;
        unsigned char *ivk = unhex(argv[2], &ivk_len);
        unsigned char *epk = unhex(argv[3], &epk_len);
        unsigned char *ciphertext = unhex(argv[4], &ciphertext_len);
        unsigned char *plaintext = malloc(ciphertext_len + 1);

        if (ivk_len != 32 || epk_len != 32 || ciphertext_len < 16 || !plaintext)
            return 2;

        /* The recipient derives the same key from its IVK and the sender's EPK. */
        if (!librustzcash_sapling_ka_agree(epk, ivk, shared)) return 3;

        derive_key(key, shared, epk);

        unsigned long long plaintext_len;

        if (crypto_aead_chacha20poly1305_ietf_decrypt(plaintext, &plaintext_len,
            NULL, ciphertext, ciphertext_len, NULL, 0, nonce, key)) {
            fprintf(stderr, "Ciphertext authentication failed\n");
            return 4;
        }

        hex(plaintext, plaintext_len);
        puts("");

        sodium_memzero(ivk, ivk_len);
        free(ivk);
        free(epk);
        free(ciphertext);
        free(plaintext);
    } else return 2;

    sodium_memzero(key, sizeof(key));
    sodium_memzero(shared, sizeof(shared));

    return 0;
}
