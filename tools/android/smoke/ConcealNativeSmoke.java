import com.facebook.crypto.Crypto;
import com.facebook.crypto.CryptoConfig;
import com.facebook.crypto.Entity;
import com.facebook.crypto.keychain.KeyChain;
import com.facebook.crypto.util.NativeCryptoLibrary;
import java.io.ByteArrayOutputStream;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** Run with app_process and the app APK on CLASSPATH; uses public synthetic data only. */
public final class ConcealNativeSmoke {
  private static final class TestKeyChain implements KeyChain {
    private final byte[] key;
    private final byte[] iv;

    TestKeyChain(CryptoConfig config) {
      key = new byte[config.keyLength];
      iv = new byte[config.ivLength];
      for (int i = 0; i < key.length; i++) key[i] = (byte) i;
      for (int i = 0; i < iv.length; i++) iv[i] = (byte) (i + 32);
    }

    public byte[] getCipherKey() { return key.clone(); }
    public byte[] getMacKey() { return new byte[64]; }
    public byte[] getNewIV() { return iv.clone(); }
    public void destroyKeys() { }
  }

  private static void require(boolean value, String message) {
    if (!value) throw new AssertionError(message);
  }

  private static byte[] standardCiphertext(
      byte[] plain, Entity entity, TestKeyChain keys, CryptoConfig config) throws Exception {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(keys.getCipherKey(), "AES"),
        new GCMParameterSpec(config.tagLength * 8, keys.getNewIV()));
    // Existing Conceal serialization: version, cipher ID, IV, ciphertext and tag.
    cipher.updateAAD(new byte[] {1, config.cipherId});
    cipher.updateAAD(entity.getBytes());
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    output.write(1);
    output.write(config.cipherId);
    output.write(keys.getNewIV());
    output.write(cipher.doFinal(plain));
    return output.toByteArray();
  }

  public static void main(String[] args) throws Exception {
    require(args.length == 1, "Supply the absolute path to libconceal.so");
    System.load(args[0]);
    NativeCryptoLibrary loaded = new NativeCryptoLibrary() {
      public void ensureCryptoLoaded() { }
    };
    Entity entity = Entity.create("verus-16kb-public-test-credential");
    for (CryptoConfig config : new CryptoConfig[] {CryptoConfig.KEY_128, CryptoConfig.KEY_256}) {
      TestKeyChain keys = new TestKeyChain(config);
      Crypto crypto = new Crypto(keys, loaded, config);
      require(crypto.isAvailable(), "Conceal native initialization failed");
      for (int length : new int[] {0, 1, 16, 71, 4097}) {
        byte[] plain = new byte[length];
        for (int i = 0; i < length; i++) plain[i] = (byte) (i * 13 + 7);
        byte[] reference = standardCiphertext(plain, entity, keys, config);
        require(Arrays.equals(crypto.encrypt(plain, entity), reference),
            "Native encryption differs from standard AES-GCM/Conceal serialization");
        require(Arrays.equals(crypto.decrypt(reference, entity), plain),
            "Native decryption cannot read the existing Conceal data format");
        reference[reference.length - 1] ^= 1;
        boolean rejected = false;
        try {
          crypto.decrypt(reference, entity);
        } catch (java.io.IOException expected) {
          rejected = true;
        }
        require(rejected, "Modified authentication tag was accepted");
      }
      System.out.println("PASS: Conceal AES-" + (config.keyLength * 8)
          + " JNI encryption/decryption matches JCA; tampering rejected for 5 payload lengths");
    }
  }
}
