/* eslint-disable react/prop-types, no-use-before-define */
import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, {
  Defs, LinearGradient, Stop, Rect,
} from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../../globals/colors';

const HERO_HEIGHT = 220;

/**
 * Best-effort NFT hero preview for marketplace signing screens (makeoffer/
 * takeoffer/closeoffer). Renders whatever `parseNftPreview` could extract from
 * the NFT's on-chain contentmultimap as a large image with the name/description
 * overlaid, matching the modern card language used elsewhere in the wallet
 * (see InvoiceInfo's requesterCard/sectionCard + gradient scrim on GradientButton).
 * Never blocks or fails the signing flow — a missing or broken image just
 * falls back to a plain placeholder card.
 *
 * @param {object} props
 * @param {{displayName?: string, description?: string, image?: string, contentType?: string, albumCover?: string, creator?: string}} [props.preview]
 * @param {string} props.fallbackName - shown when preview.displayName is absent (e.g. the identity name/i-address).
 * @param {{checked: boolean, verified: boolean}} [props.verification] - result of nftIntegrity.js's
 *   verifyNftContentHash. `checked: false` (older/non-secure-name NFTs) shows nothing — not a red
 *   flag. `checked: true` shows a green "Verified" or red "Unverified" badge depending on whether
 *   the current on-chain metadata still hashes to what's embedded in the identity's name.
 */
const MarketplaceAssetPreview = ({ preview, fallbackName, verification }) => {
  const [imageFailed, setImageFailed] = useState(false);

  const name = (preview && preview.displayName) || fallbackName;
  const description = preview && preview.description;
  const contentType = (preview && preview.contentType) || '';
  const isAudio = contentType.startsWith('audio/');
  const isVideo = contentType.startsWith('video/');
  const imageUrl = preview && (preview.image || (isAudio && preview.albumCover));
  const hasImage = Boolean(imageUrl) && !imageFailed;

  let typeBadge = null;
  if (isAudio) {
    typeBadge = { icon: 'music-note', label: 'AUDIO' };
  } else if (isVideo) {
    typeBadge = { icon: 'play-circle-outline', label: 'VIDEO' };
  }

  let integrityBadge = null;
  if (verification && verification.checked) {
    integrityBadge = verification.verified
      ? { icon: 'shield-check', label: 'VERIFIED', color: Colors.verusGreenColor }
      : { icon: 'shield-alert', label: 'UNVERIFIED', color: Colors.warningButtonColor };
  }

  return (
    <View style={styles.heroCard}>
      {hasImage ? (
        <>
          <Image
            source={{ uri: imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
          {/* Bottom scrim keeps the overlaid name/description legible over any image. */}
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="assetScrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.4" stopColor="#000000" stopOpacity="0" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0.8" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#assetScrim)" />
          </Svg>
          <View style={styles.topBadgeRow}>
            {integrityBadge ? (
              <View style={[styles.badge, { backgroundColor: integrityBadge.color }]}>
                <MaterialCommunityIcons name={integrityBadge.icon} size={13} color="#FFFFFF" />
                <Text style={styles.badgeText}>{integrityBadge.label}</Text>
              </View>
            ) : (
              <View />
            )}
            {typeBadge ? (
              <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                <MaterialCommunityIcons name={typeBadge.icon} size={13} color="#FFFFFF" />
                <Text style={styles.badgeText}>{typeBadge.label}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.overlayText}>
            <Text style={styles.heroName} numberOfLines={1}>
              {name}
            </Text>
            {description ? (
              <Text style={styles.heroDescription} numberOfLines={2}>
                {description}
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <View style={styles.placeholder}>
          <MaterialCommunityIcons
            name={imageUrl ? 'image-off-outline' : 'image-outline'}
            size={40}
            color={Colors.verusDarkGray}
          />
          <Text style={styles.placeholderName} numberOfLines={1}>
            {name}
          </Text>
          {description ? (
            <Text style={styles.placeholderDescription} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
          {integrityBadge ? (
            <View style={[styles.badge, { backgroundColor: integrityBadge.color, marginTop: 8 }]}>
              <MaterialCommunityIcons name={integrityBadge.icon} size={13} color="#FFFFFF" />
              <Text style={styles.badgeText}>{integrityBadge.label}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    width: '100%',
    height: HERO_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#EDEDED',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  topBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overlayText: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
  },
  heroName: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 2,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  placeholderName: {
    color: Colors.quaternaryColor,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  placeholderDescription: {
    color: Colors.verusDarkGray,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default MarketplaceAssetPreview;
