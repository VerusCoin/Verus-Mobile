import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import {Pencil, Plus} from 'lucide-react-native';
import {fromBase58Check} from 'verus-typescript-primitives';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import AppButton from '../../../../components/AppButton';
import AppSearchField, {
  APP_SEARCH_MIN_ITEMS,
} from '../../../../components/AppSearchField';
import AppAddressInput from '../../../../components/AppAddressInput';
import InfoSheetSection from '../../../../components/InfoSheetSection';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import SheetScrollView from '../../../../components/SheetScrollView';
import SkeletonLoader, {SkeletonBlock} from '../../../../components/SkeletonLoader';
import {fontStyle} from '../../../../globals/fonts';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import Store from '../../../../store';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {
  getFriendlyNameMap,
  getIdentitiesWithAddress,
  getIdentity,
} from '../../../../utils/api/channels/verusid/callCreators';
import {VRPC} from '../../../../utils/constants/intervalConstants';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';
import {isIdentityIndexUnavailable} from '../../../../utils/api/channels/verusid/identityIndex';
import {
  captureIdentityLinkOrigin,
  identityLinkCandidateIsLinkable,
  identityLinkOriginIsCurrent,
} from '../../../../utils/verusid/verusIdFlowGuards';
import {buildVerusIdSections} from '../RequestReview/DeepLinkVerusIdDetailsSheet';
import {
  CONNECTION_FAILED_MESSAGE,
  isConnectionErrorMessage,
} from '../../../../utils/network/connectionErrors';

const CANDIDATE_ROW_TOTAL_HEIGHT = 64;
const LIST_CONTENT_VERTICAL_PADDING = 4;
const DEFAULT_CANDIDATE_LIST_HEIGHT =
  4 * CANDIDATE_ROW_TOTAL_HEIGHT + LIST_CONTENT_VERTICAL_PADDING;
const SCROLL_CUE_HEIGHT = 42;
const SCROLL_END_THRESHOLD = 8;
const IDENTITY_SKELETON_WIDTHS = ['44%', '62%', '50%', '70%'];

export const LINK_EXISTING_VERUSID_SHEET_MODES = {
  LIST: 'list',
  MANUAL: 'manual',
};

export const LINK_EXISTING_VERUSID_MANUAL_PHASES = {
  INPUT: 'input',
  RESOLVING: 'resolving',
  REVIEW: 'review',
};

const MANUAL_MESSAGE_MAX_LENGTH = 140;
const MANUAL_LOOKUP_FALLBACK_MESSAGE =
  'Unable to look up that VerusID. Check the name and try again.';
const MANUAL_LINK_FALLBACK_MESSAGE = 'Unable to link this VerusID. Try again.';

const isTechnicalMessage = message =>
  /rpc|json|0x[0-9a-f]{6,}|-?\d{3,}/i.test(String(message || ''));

// A VerusID can be entered as a friendly name (with or without the trailing
// "@") or as an i-Address. Only the name form is normalized.
const normalizeManualLookup = value => {
  const trimmed = String(value == null ? '' : value).trim();

  if (!trimmed || trimmed.endsWith('@')) return trimmed;

  try {
    fromBase58Check(trimmed);
    return trimmed;
  } catch (e) {
    return `${trimmed}@`;
  }
};

const describeLookupFailure = error => {
  const message =
    typeof error?.message === 'string' ? error.message.trim() : '';

  if (/not found|no such identity|unable to find/i.test(message)) {
    return 'No VerusID found with that name or i-Address.';
  }

  if (isConnectionErrorMessage(message)) return CONNECTION_FAILED_MESSAGE;

  if (
    !message ||
    message.length > MANUAL_MESSAGE_MAX_LENGTH ||
    isTechnicalMessage(message)
  ) {
    return MANUAL_LOOKUP_FALLBACK_MESSAGE;
  }

  return message;
};

const describeLinkFailure = error => {
  const message =
    typeof error?.message === 'string' ? error.message.trim() : '';

  if (isConnectionErrorMessage(message)) return CONNECTION_FAILED_MESSAGE;

  if (
    !message ||
    message.length > MANUAL_MESSAGE_MAX_LENGTH ||
    isTechnicalMessage(message)
  ) {
    return MANUAL_LINK_FALLBACK_MESSAGE;
  }

  return message;
};

// Manual linking resolves the identity read-only from the stored wallet
// addresses. No seed, key, or signing material is requested.
const buildResolvedCandidate = ({
  chainId,
  identityResult,
  origin,
  systemId,
  walletAddresses,
}) => {
  const identity = identityResult?.identity || {};
  const identityAddress =
    identity.identityaddress || identity.identityAddress || null;
  const fullyQualifiedName =
    identityResult?.fullyqualifiedname ||
    identityResult?.fullyQualifiedName ||
    null;
  const primaryAddresses =
    identity.primaryaddresses || identity.primaryAddresses || [];
  const walletAddressList = Array.isArray(walletAddresses)
    ? walletAddresses
    : [];

  return {
    chainId,
    displayName: fullyQualifiedName
      ? convertFqnToDisplayFormat(fullyQualifiedName)
      : null,
    fullyQualifiedName,
    identity,
    identityAddress,
    identityResult,
    name: identity.name || null,
    origin: origin || null,
    primaryAddress:
      primaryAddresses.find(address => walletAddressList.includes(address)) ||
      null,
    status: identityResult?.status || null,
    systemId,
  };
};

const normalizeDiscoveryResult = result => {
  if (result == null) return [];
  return Array.isArray(result) ? result : [result];
};

const getIdentityAddress = result => {
  return (
    result?.identityaddress ||
    result?.identityAddress ||
    result?.identity?.identityaddress ||
    result?.identity?.identityAddress ||
    null
  );
};

const getCandidateDisplayName = candidate => {
  const displaySource =
    candidate.fullyQualifiedName || candidate.friendlyName || candidate.name;

  return displaySource ? convertFqnToDisplayFormat(displaySource) : null;
};

const toSearchValue = candidate => {
  return [
    candidate.identityAddress,
    candidate.displayName,
    candidate.name,
    candidate.friendlyName,
    candidate.fullyQualifiedName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const buildLinkedAddressSet = linkedIds => {
  const linkedAddresses = new Set();

  for (const chainId of Object.keys(linkedIds || {})) {
    for (const iAddress of Object.keys(linkedIds[chainId] || {})) {
      linkedAddresses.add(iAddress.toLowerCase());
    }
  }

  return linkedAddresses;
};

const LinkExistingVerusIdSheet = ({
  active,
  candidateListHeight = DEFAULT_CANDIDATE_LIST_HEIGHT,
  coinObj,
  initialManualValue = '',
  initialMode = LINK_EXISTING_VERUSID_SHEET_MODES.LIST,
  isCandidateAllowed,
  linkedIds,
  onBusyChange,
  onLinkCandidate,
  onManualLink,
  onManualRoomChange,
  onSearchVisibleChange,
}) => {
  const theme = useOnboardingTheme();
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const listRef = useRef(null);
  const linkRequestIdRef = useRef(0);
  const linkingRef = useRef(false);
  const manualRequestIdRef = useRef(0);
  const manualResolvingRef = useRef(false);
  const onBusyChangeRef = useRef(onBusyChange);
  const requestIdRef = useRef(0);
  const sheetSessionRef = useRef(0);
  // Keep the latest callback without forcing the session effects to re-run.
  onBusyChangeRef.current = onBusyChange;
  const onSearchVisibleChangeRef = useRef(onSearchVisibleChange);
  onSearchVisibleChangeRef.current = onSearchVisibleChange;
  const onManualRoomChangeRef = useRef(onManualRoomChange);
  onManualRoomChangeRef.current = onManualRoomChange;
  const coinId = coinObj?.id;
  const systemId = coinObj?.system_id;
  const primaryAddress = useObjectSelector(state =>
    coinId
      ? state.authentication.activeAccount?.keys?.[coinId]?.[VRPC]
          ?.addresses?.[0] || null
      : null,
  );
  const walletAddresses = useObjectSelector(state =>
    coinId
      ? state.authentication.activeAccount?.keys?.[coinId]?.[VRPC]
          ?.addresses || null
      : null,
  );
  // Account hash and login epoch together identify the wallet session a
  // candidate was discovered or resolved in. Both are captured so a switch
  // between two accounts that share the same first R-address still invalidates
  // stale work.
  const sessionScopeKey = useObjectSelector(state =>
    coinId
      ? `${
          state.authentication.activeAccount?.accountHash ?? 'none'
        }:${state.authentication.sessionEpoch ?? 0}`
      : null,
  );
  const [candidates, setCandidates] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [loading, setLoading] = useState(active);
  const [manualError, setManualError] = useState(null);
  const [manualFriendlyNames, setManualFriendlyNames] = useState(null);
  const [manualPhase, setManualPhase] = useState(
    LINK_EXISTING_VERUSID_MANUAL_PHASES.INPUT,
  );
  const [manualValue, setManualValue] = useState('');
  const [mode, setMode] = useState(
    initialMode === LINK_EXISTING_VERUSID_SHEET_MODES.MANUAL
      ? LINK_EXISTING_VERUSID_SHEET_MODES.MANUAL
      : LINK_EXISTING_VERUSID_SHEET_MODES.LIST,
  );
  const [resolvedCandidate, setResolvedCandidate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBottomScrollCue, setShowBottomScrollCue] = useState(false);
  const [showTopScrollCue, setShowTopScrollCue] = useState(false);
  const linkedAddressSet = useMemo(
    () => buildLinkedAddressSet(linkedIds),
    [linkedIds],
  );

  useEffect(() => {
    if (!active) {
      sheetSessionRef.current += 1;
      requestIdRef.current += 1;
      linkRequestIdRef.current += 1;
      manualRequestIdRef.current += 1;
      linkingRef.current = false;
      manualResolvingRef.current = false;
      onBusyChangeRef.current?.(false);
      setCandidates([]);
      setErrorMessage(null);
      setLinkError(null);
      setLinking(false);
      setLoading(false);
      setManualError(null);
      setManualFriendlyNames(null);
      setManualPhase(LINK_EXISTING_VERUSID_MANUAL_PHASES.INPUT);
      setManualValue('');
      setResolvedCandidate(null);
      setSearchQuery('');
      setShowBottomScrollCue(false);
      setShowTopScrollCue(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    // The discovery belongs to the wallet session that started it. Every await
    // below re-checks this captured scope before writing state or candidates.
    const origin = captureIdentityLinkOrigin(Store.getState(), {
      chainId: coinId,
      walletAddress: primaryAddress,
    });
    const isRequestCurrent = () =>
      requestIdRef.current === requestId &&
      identityLinkOriginIsCurrent(Store.getState(), origin);

    const discover = async () => {
      setCandidates([]);
      setErrorMessage(null);
      setLoading(true);

      try {
        if (!systemId) {
          throw new Error('Missing VerusID network.');
        }

        if (!primaryAddress) {
          throw new Error('No wallet R-address found for this account.');
        }

        const discoveryRes = await getIdentitiesWithAddress(
          systemId,
          primaryAddress,
          false,
        );

        if (!isRequestCurrent()) return;

        if (discoveryRes.error) {
          if (isIdentityIndexUnavailable(discoveryRes.error)) {
            if (isRequestCurrent()) {
              setErrorMessage(
                'Automatic VerusID lookup is unavailable for this chain.',
              );
            }
            return;
          }

          throw new Error(discoveryRes.error.message);
        }

        const discoveredCandidates = await Promise.all(
          normalizeDiscoveryResult(discoveryRes.result).map(
            async discoveryResult => {
              const identityAddress = getIdentityAddress(discoveryResult);

              if (!identityAddress) return null;

              let identityRes;

              try {
                identityRes = await getIdentity(systemId, identityAddress);
              } catch (e) {
                return null;
              }

              if (!isRequestCurrent()) return null;
              if (identityRes.error) return null;

              const enrichedResult = identityRes.result;
              const enrichedIdentity = enrichedResult?.identity || {};
              const finalIdentityAddress =
                enrichedIdentity.identityaddress ||
                getIdentityAddress(enrichedResult) ||
                identityAddress;
              const candidate = {
                chainId: coinId,
                displayName: null,
                identity: enrichedIdentity,
                identityAddress: finalIdentityAddress,
                identityResult: enrichedResult,
                name: enrichedIdentity.name || discoveryResult?.name || null,
                origin,
                friendlyName:
                  enrichedResult?.friendlyname ||
                  enrichedResult?.friendlyName ||
                  discoveryResult?.friendlyname ||
                  discoveryResult?.friendlyName ||
                  null,
                fullyQualifiedName:
                  enrichedResult?.fullyqualifiedname ||
                  enrichedResult?.fullyQualifiedName ||
                  discoveryResult?.fullyqualifiedname ||
                  discoveryResult?.fullyQualifiedName ||
                  null,
                primaryAddress,
                status: enrichedResult?.status || discoveryResult?.status || null,
                systemId,
              };

              candidate.displayName = getCandidateDisplayName(candidate);

              // The index also returns VerusIDs that used this address in the
              // past. Only a VerusID that uses it now can be linked.
              const currentPrimaryAddresses =
                enrichedIdentity.primaryaddresses ||
                enrichedIdentity.primaryAddresses ||
                [];

              if (
                candidate.status !== 'active' ||
                !candidate.displayName ||
                !currentPrimaryAddresses.includes(primaryAddress) ||
                linkedAddressSet.has(finalIdentityAddress.toLowerCase())
              ) {
                return null;
              }

              if (
                typeof isCandidateAllowed === 'function' &&
                !isCandidateAllowed(candidate)
              ) {
                return null;
              }

              return candidate;
            },
          ),
        );

        const deduped = [];
        const seen = new Set();

        for (const candidate of discoveredCandidates) {
          if (!candidate?.identityAddress) continue;

          const key = candidate.identityAddress.toLowerCase();
          if (seen.has(key)) continue;

          seen.add(key);
          deduped.push(candidate);
        }

        if (!isRequestCurrent()) return;

        deduped.sort((left, right) =>
          left.displayName.localeCompare(right.displayName),
        );

        if (isRequestCurrent()) {
          setCandidates(deduped);
        }
      } catch (e) {
        if (isRequestCurrent()) {
          if (isIdentityIndexUnavailable(e)) {
            setErrorMessage(
              'Automatic VerusID lookup is unavailable for this chain.',
            );
          } else {
            setErrorMessage('Unable to find VerusIDs right now.');
          }
        }
      } finally {
        if (isRequestCurrent()) {
          setLoading(false);
        }
      }
    };

    discover();

    return () => {
      requestIdRef.current += 1;
    };
  }, [
    active,
    coinId,
    isCandidateAllowed,
    linkedAddressSet,
    primaryAddress,
    sessionScopeKey,
    systemId,
  ]);

  // The sheet is reused between openings; each active session starts from the
  // caller's requested step instead of the previous session's state.
  useEffect(() => {
    if (!active) return;

    // A fresh session invalidates any in-flight link or lookup so a stale
    // completion cannot write into this opening.
    sheetSessionRef.current += 1;
    linkRequestIdRef.current += 1;
    manualRequestIdRef.current += 1;
    linkingRef.current = false;
    manualResolvingRef.current = false;
    setLinkError(null);
    setManualError(null);
    setManualFriendlyNames(null);
    setManualPhase(LINK_EXISTING_VERUSID_MANUAL_PHASES.INPUT);
    setManualValue(initialManualValue || '');
    setMode(
      initialMode === LINK_EXISTING_VERUSID_SHEET_MODES.MANUAL
        ? LINK_EXISTING_VERUSID_SHEET_MODES.MANUAL
        : LINK_EXISTING_VERUSID_SHEET_MODES.LIST,
    );
    setResolvedCandidate(null);
  }, [active, initialManualValue, initialMode]);

  // A live account-hash or login-epoch change invalidates any in-flight link
  // or shown manual resolution: the candidate belongs to the previous session.
  const previousScopeKeyRef = useRef(sessionScopeKey);
  useEffect(() => {
    if (!active) return;
    if (previousScopeKeyRef.current === sessionScopeKey) return;

    previousScopeKeyRef.current = sessionScopeKey;
    linkRequestIdRef.current += 1;
    manualRequestIdRef.current += 1;
    linkingRef.current = false;
    manualResolvingRef.current = false;
    onBusyChangeRef.current?.(false);
    setLinking(false);
    setLinkError(null);
    setManualError(null);
    setManualFriendlyNames(null);
    setManualPhase(LINK_EXISTING_VERUSID_MANUAL_PHASES.INPUT);
    setResolvedCandidate(null);
  }, [active, sessionScopeKey]);

  // The search field shows only from 7 found VerusIDs, and only after the
  // lookup ends. The count ignores the search text, so the field does not
  // disappear while the user types. Without it, the list shows every VerusID.
  const searchable = !loading && candidates.length >= APP_SEARCH_MIN_ITEMS;
  const activeSearchQuery = searchable ? searchQuery : '';

  // The parent sizes the sheet: it reserves room for the field only while the
  // field shows. When the field hides, the search text goes back to empty.
  useEffect(() => {
    onSearchVisibleChangeRef.current?.(searchable);

    if (!searchable) setSearchQuery('');
  }, [searchable]);
  useEffect(() => () => onSearchVisibleChangeRef.current?.(false), []);

  // The automatic lookup finds every VerusID that can be linked, so the manual
  // row shows only when the lookup failed or the chain has no identity index.
  // The parent keeps the row's room while the row or the manual step shows.
  const showManualRow = !loading && Boolean(errorMessage);
  const needsManualRoom =
    showManualRow || mode === LINK_EXISTING_VERUSID_SHEET_MODES.MANUAL;

  useEffect(() => {
    onManualRoomChangeRef.current?.(needsManualRoom);
  }, [needsManualRoom]);
  useEffect(() => () => onManualRoomChangeRef.current?.(false), []);

  const filteredCandidates = useMemo(() => {
    const query = activeSearchQuery.trim().toLowerCase();

    if (!query) return candidates;

    return candidates.filter(candidate =>
      toSearchValue(candidate).includes(query),
    );
  }, [activeSearchQuery, candidates]);
  const listViewportHeight = Math.max(
    CANDIDATE_ROW_TOTAL_HEIGHT + LIST_CONTENT_VERTICAL_PADDING,
    candidateListHeight,
  );
  const candidateContentHeight =
    filteredCandidates.length * CANDIDATE_ROW_TOTAL_HEIGHT +
    LIST_CONTENT_VERTICAL_PADDING;
  const candidateListScrollable =
    candidateContentHeight > listViewportHeight + SCROLL_END_THRESHOLD;

  useEffect(() => {
    listRef.current?.scrollToOffset?.({offset: 0, animated: false});
    setShowTopScrollCue(false);
    setShowBottomScrollCue(candidateListScrollable);
  }, [
    candidateListScrollable,
    filteredCandidates.length,
    listViewportHeight,
    activeSearchQuery,
  ]);

  useEffect(() => {
    if (!active || !candidateListScrollable || filteredCandidates.length === 0) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      listRef.current?.flashScrollIndicators?.();
    }, 260);

    return () => clearTimeout(timeout);
  }, [
    active,
    activeSearchQuery,
    candidateListScrollable,
    filteredCandidates.length,
  ]);

  const handleLinkCandidate = async candidate => {
    // Same-frame double taps must only start one link. A ref guard is
    // synchronous; the `linking` state update is not.
    if (linkingRef.current) return;

    // The candidate must still belong to the account that is scoped right now.
    // This runs before the parent link handler so a candidate resolved for
    // account A can never link into account B, even if the sheet stayed
    // mounted across the switch.
    if (!identityLinkCandidateIsLinkable(Store.getState(), candidate)) {
      setLinkError(
        'This VerusID no longer matches the active wallet. Reopen this sheet and try again.',
      );
      setManualError(
        'This VerusID no longer matches the active wallet. Reopen this sheet and try again.',
      );
      return;
    }

    const session = sheetSessionRef.current;
    const requestId = linkRequestIdRef.current + 1;
    linkRequestIdRef.current = requestId;
    linkingRef.current = true;

    setLinkError(null);
    setManualError(null);
    setLinking(true);
    onBusyChangeRef.current?.(true);

    try {
      await onLinkCandidate(candidate);
    } catch (e) {
      // Keep the sheet stable and show why the link did not complete. The
      // parent keeps ownership of the rules that allow the link at all.
      if (
        linkRequestIdRef.current === requestId &&
        sheetSessionRef.current === session
      ) {
        setLinkError(describeLinkFailure(e));
        setManualError(describeLinkFailure(e));
      }
    } finally {
      // A superseding session already reset the shared state.
      if (linkRequestIdRef.current === requestId) {
        linkingRef.current = false;
        setLinking(false);
        onBusyChangeRef.current?.(false);
      }
    }
  };

  const getCandidateValidationError = candidate => {
    if (
      !candidate?.identityAddress ||
      !candidate?.fullyQualifiedName ||
      !candidate?.displayName
    ) {
      return 'Unable to link this VerusID.';
    }

    if (candidate.status !== 'active') {
      return 'Only active VerusIDs can be linked.';
    }

    if (linkedAddressSet.has(candidate.identityAddress.toLowerCase())) {
      return 'This VerusID is already linked to this wallet.';
    }

    if (
      candidate.origin &&
      !identityLinkOriginIsCurrent(Store.getState(), candidate.origin)
    ) {
      return 'This VerusID no longer matches the active wallet. Reopen this sheet and try again.';
    }

    if (
      typeof isCandidateAllowed === 'function' &&
      !isCandidateAllowed(candidate)
    ) {
      return 'This VerusID does not match the selected network or request.';
    }

    if (!candidate.primaryAddress) {
      return 'This VerusID does not use a primary address from this wallet.';
    }

    return null;
  };

  const resolveManualIdentity = async () => {
    if (
      linkingRef.current ||
      manualResolvingRef.current ||
      manualPhase === LINK_EXISTING_VERUSID_MANUAL_PHASES.RESOLVING
    ) {
      return;
    }

    const session = sheetSessionRef.current;
    const lookup = normalizeManualLookup(manualValue);

    if (!lookup) {
      setManualError('Enter a VerusID name or i-Address.');
      return;
    }

    if (!systemId) {
      setManualError('This VerusID network is unavailable right now.');
      return;
    }

    const requestId = manualRequestIdRef.current + 1;
    manualRequestIdRef.current = requestId;
    manualResolvingRef.current = true;
    // The lookup belongs to the wallet session that started it, not just the
    // sheet. A resolved candidate must be re-checked before review and link.
    const origin = captureIdentityLinkOrigin(Store.getState(), {
      chainId: coinId,
      walletAddress: primaryAddress,
    });
    setManualError(null);
    setManualFriendlyNames(null);
    setResolvedCandidate(null);
    setManualPhase(LINK_EXISTING_VERUSID_MANUAL_PHASES.RESOLVING);

    const isRequestCurrent = () =>
      manualRequestIdRef.current === requestId &&
      sheetSessionRef.current === session &&
      identityLinkOriginIsCurrent(Store.getState(), origin);

    try {
      const identityRes = await getIdentity(systemId, lookup);

      if (!isRequestCurrent()) return;

      if (identityRes.error) {
        setManualPhase(LINK_EXISTING_VERUSID_MANUAL_PHASES.INPUT);
        setManualError(describeLookupFailure(identityRes.error));
        return;
      }

      const friendlyNames = await getFriendlyNameMap(
        systemId,
        identityRes.result,
      ).catch(() => null);

      if (!isRequestCurrent()) return;

      const candidate = buildResolvedCandidate({
        chainId: coinId,
        identityResult: identityRes.result,
        origin,
        systemId,
        walletAddresses,
      });
      const candidateError = getCandidateValidationError(candidate);

      if (candidateError) {
        setManualPhase(LINK_EXISTING_VERUSID_MANUAL_PHASES.INPUT);
        setManualError(candidateError);
        return;
      }

      Keyboard.dismiss();
      setManualFriendlyNames(friendlyNames || {});
      setResolvedCandidate(candidate);
      setManualPhase(LINK_EXISTING_VERUSID_MANUAL_PHASES.REVIEW);
    } catch (e) {
      if (!isRequestCurrent()) return;

      setManualPhase(LINK_EXISTING_VERUSID_MANUAL_PHASES.INPUT);
      setManualError(describeLookupFailure(e));
    } finally {
      if (manualRequestIdRef.current === requestId) {
        manualResolvingRef.current = false;
      }
    }
  };

  const openManualMode = () => {
    // The internal manual step needs a resolvable network. Consumers that
    // cannot provide one keep their existing fallback.
    if (!systemId && typeof onManualLink === 'function') {
      onManualLink();
      return;
    }

    setLinkError(null);
    setManualError(null);
    setManualPhase(LINK_EXISTING_VERUSID_MANUAL_PHASES.INPUT);
    setResolvedCandidate(null);
    setMode(LINK_EXISTING_VERUSID_SHEET_MODES.MANUAL);
  };

  const closeManualMode = () => {
    manualRequestIdRef.current += 1;
    manualResolvingRef.current = false;
    Keyboard.dismiss();
    setManualError(null);
    setManualFriendlyNames(null);
    setManualPhase(LINK_EXISTING_VERUSID_MANUAL_PHASES.INPUT);
    setResolvedCandidate(null);
    setMode(LINK_EXISTING_VERUSID_SHEET_MODES.LIST);
  };

  const returnToManualInput = () => {
    manualRequestIdRef.current += 1;
    manualResolvingRef.current = false;
    setManualError(null);
    setResolvedCandidate(null);
    setManualPhase(LINK_EXISTING_VERUSID_MANUAL_PHASES.INPUT);
  };

  const confirmResolvedCandidate = () => {
    if (!resolvedCandidate) return;

    handleLinkCandidate(resolvedCandidate);
  };

  const handleCandidateListScroll = event => {
    const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
    const isAtTop = contentOffset.y <= SCROLL_END_THRESHOLD;
    const isAtEnd =
      contentOffset.y + layoutMeasurement.height >=
      contentSize.height - SCROLL_END_THRESHOLD;

    setShowTopScrollCue(current => {
      const next = candidateListScrollable && !isAtTop;
      return current === next ? current : next;
    });
    setShowBottomScrollCue(current => {
      const next = candidateListScrollable && !isAtEnd;
      return current === next ? current : next;
    });
  };

  if (linking) {
    return (
      <LoadingState
        label="Linking VerusID"
        minHeight={listViewportHeight}
        styles={styles}
      />
    );
  }

  if (mode === LINK_EXISTING_VERUSID_SHEET_MODES.MANUAL) {
    if (
      manualPhase === LINK_EXISTING_VERUSID_MANUAL_PHASES.REVIEW &&
      resolvedCandidate
    ) {
      return (
        <ManualReviewStep
          candidate={resolvedCandidate}
          errorMessage={manualError}
          friendlyNames={manualFriendlyNames}
          onBack={returnToManualInput}
          onConfirm={confirmResolvedCandidate}
          styles={styles}
          theme={theme}
        />
      );
    }

    return (
      <ManualEntryStep
        errorMessage={manualError}
        onBack={closeManualMode}
        onChangeValue={value => {
          setManualValue(value);
          if (manualError) setManualError(null);
        }}
        onLookup={resolveManualIdentity}
        resolving={
          manualPhase === LINK_EXISTING_VERUSID_MANUAL_PHASES.RESOLVING
        }
        styles={styles}
        theme={theme}
        value={manualValue}
      />
    );
  }

  return (
    <>
      {loading ? (
        <DiscoverySkeleton
          minHeight={listViewportHeight}
          styles={styles}
          theme={theme}
        />
      ) : (
        <>
          {searchable && (
            <AppSearchField
              accessibilityLabel="Search VerusID"
              onChangeText={setSearchQuery}
              placeholder="Search VerusID"
              resultCount={filteredCandidates.length}
              style={styles.searchContainer}
              themeMode={theme.mode}
              value={searchQuery}
            />
          )}
          {linkError && (
            <Text accessibilityLiveRegion="polite" style={styles.linkError}>
              {linkError}
            </Text>
          )}
          {errorMessage && (
            <View style={[styles.statusState, {minHeight: listViewportHeight}]}>
              <Text style={styles.statusText}>{errorMessage}</Text>
            </View>
          )}
          {!errorMessage && candidates.length === 0 && (
            <View style={[styles.statusState, {minHeight: listViewportHeight}]}>
              <Text style={styles.statusText}>
                {'No VerusIDs were found for this wallet.'}
              </Text>
            </View>
          )}
          {!errorMessage &&
            candidates.length > 0 &&
            filteredCandidates.length === 0 && (
              <View style={[styles.statusState, {minHeight: listViewportHeight}]}>
                <Text style={styles.statusText}>
                  {'No VerusIDs match that search.'}
                </Text>
              </View>
            )}
          {filteredCandidates.length > 0 && (
            <View style={[styles.listFrame, {height: listViewportHeight}]}>
              <FlatList
                ref={listRef}
                alwaysBounceVertical={false}
                bounces={false}
                contentContainerStyle={signedOutSheetStyles.listContent}
                data={filteredCandidates}
                keyExtractor={candidate => candidate.identityAddress}
                keyboardShouldPersistTaps="handled"
                onScroll={handleCandidateListScroll}
                renderItem={({item}) => (
                  <CandidateRow
                    candidate={item}
                    onPress={() => handleLinkCandidate(item)}
                    styles={styles}
                    theme={theme}
                  />
                )}
                scrollEventThrottle={16}
                scrollEnabled={candidateListScrollable}
                showsVerticalScrollIndicator={candidateListScrollable}
              />
              {showTopScrollCue && (
                <ScrollCue position="top" styles={styles} theme={theme} />
              )}
              {showBottomScrollCue && (
                <ScrollCue position="bottom" styles={styles} theme={theme} />
              )}
            </View>
          )}
        </>
      )}
      {showManualRow && (
        <ManualLinkRow
          onPress={openManualMode}
          signedOutSheetStyles={signedOutSheetStyles}
          theme={theme}
        />
      )}
    </>
  );
};

const ManualEntryStep = ({
  errorMessage,
  onBack,
  onChangeValue,
  onLookup,
  resolving,
  styles,
  theme,
  value,
}) => (
  <View>
    <Text accessibilityRole="header" style={styles.manualStepTitle}>
      Link VerusID
    </Text>
    <View style={styles.manualStepScrollFrame}>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.manualStepScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <AppAddressInput
          accessibilityLabel="VerusID name or i-Address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!resolving}
          errorText={errorMessage}
          technical={value?.startsWith('i') && !value.includes('@')}
          label="VerusID name or i-Address"
          onChangeText={onChangeValue}
          onSubmitEditing={onLookup}
          placeholder="Name or i-address"
          returnKeyType="done"
          themeMode={theme.mode}
          value={value}
        />
      </ScrollView>
    </View>
    <SafeBottomActionStack
      bottomSpacing={12}
      gap={10}
      horizontalSpacing={0}
      includeBottomInset={false}
      safeAreaSpacing={0}
      style={styles.manualStepActions}>
      <AppButton
        accessibilityLabel="Look up VerusID"
        disabled={resolving}
        height={56}
        onPress={onLookup}
        themeMode={theme.mode}>
        {resolving ? (
          <ActivityIndicator color={theme.colors.onPrimary} size={18} />
        ) : (
          'Look up VerusID'
        )}
      </AppButton>
      <AppButton
        accessibilityLabel="Back to discovered VerusIDs"
        disabled={resolving}
        height={56}
        onPress={onBack}
        themeMode={theme.mode}
        variant="secondary">
        Back
      </AppButton>
    </SafeBottomActionStack>
  </View>
);

const ManualReviewStep = ({
  candidate,
  errorMessage,
  friendlyNames,
  onBack,
  onConfirm,
  styles,
  theme,
}) => {
  const sections = buildVerusIdSections(candidate?.identityResult, friendlyNames);

  return (
    <View>
      <Text
        accessibilityRole="header"
        numberOfLines={2}
        style={styles.manualStepTitle}>
        {candidate?.displayName}
      </Text>
      <View
        style={[
          styles.reviewFrame,
          errorMessage && styles.reviewFrameWithError,
        ]}>
        {sections.length > 0 ? (
          <SheetScrollView>
            {sections.map(section => (
              <InfoSheetSection
                key={section.title}
                rows={section.rows}
                title={section.title}
              />
            ))}
          </SheetScrollView>
        ) : (
          <Text style={styles.statusText}>
            No VerusID details were returned.
          </Text>
        )}
      </View>
      {errorMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.linkError}>
          {errorMessage}
        </Text>
      ) : null}
      <SafeBottomActionStack
        bottomSpacing={8}
        gap={10}
        horizontalSpacing={0}
        includeBottomInset={false}
        safeAreaSpacing={0}
        style={styles.manualStepActions}>
        <AppButton
          accessibilityLabel={`Link ${candidate?.displayName || 'VerusID'}`}
          height={56}
          onPress={onConfirm}
          themeMode={theme.mode}>
          Link VerusID
        </AppButton>
        <AppButton
          accessibilityLabel="Back to VerusID entry"
          height={56}
          onPress={onBack}
          themeMode={theme.mode}
          variant="secondary">
          Back
        </AppButton>
      </SafeBottomActionStack>
    </View>
  );
};

const DiscoverySkeleton = ({minHeight, styles, theme}) => (
  <SkeletonLoader
    accessibilityLabel="Finding VerusIDs"
    style={[styles.skeletonState, {minHeight}]}>
    <View style={styles.skeletonList}>
      {IDENTITY_SKELETON_WIDTHS.map(width => (
        <View key={width} style={styles.identityRow}>
          <SkeletonBlock
            color={theme.colors.border}
            height={16}
            width={width}
          />
        </View>
      ))}
    </View>
  </SkeletonLoader>
);

const LoadingState = ({label, minHeight, styles}) => (
  <View
    accessibilityLabel={label}
    accessibilityRole="progressbar"
    style={[styles.loadingState, {minHeight}]}>
    <LottieView
      autoPlay
      loop
      source={require('../../../../animations/loading_7bars.json')}
      style={styles.loadingAnimation}
    />
    <Text style={styles.statusText}>{label}</Text>
  </View>
);

const ScrollCue = ({position, styles, theme}) => {
  if (position === 'top') {
    return (
      <View
        pointerEvents="none"
        style={[styles.scrollCue, styles.scrollCueTop]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="identityTopScrollCue" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={theme.colors.sheet} stopOpacity="1" />
              <Stop offset="0.28" stopColor={theme.colors.sheet} stopOpacity="0.92" />
              <Stop offset="1" stopColor={theme.colors.sheet} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#identityTopScrollCue)" />
        </Svg>
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.scrollCue, styles.scrollCueBottom]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="identityBottomScrollCue" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.sheet} stopOpacity="0" />
            <Stop offset="0.72" stopColor={theme.colors.sheet} stopOpacity="0.92" />
            <Stop offset="1" stopColor={theme.colors.sheet} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#identityBottomScrollCue)" />
      </Svg>
      <View style={styles.scrollCueChevron}>
        <MaterialCommunityIcons
          name="chevron-down"
          size={15}
          color={theme.colors.textSubtle}
        />
      </View>
    </View>
  );
};

const CandidateRow = ({candidate, onPress, styles, theme}) => (
  <TouchableOpacity
    accessibilityLabel={`Link ${candidate.displayName}`}
    accessibilityRole="button"
    activeOpacity={0.74}
    onPress={onPress}
    style={styles.identityRow}>
    <View style={styles.identityText}>
      <Text numberOfLines={1} style={styles.identityName}>
        {candidate.displayName}
      </Text>
    </View>
    <View pointerEvents="none" style={styles.plusContainer}>
      <Plus color={theme.colors.primary} size={20} strokeWidth={2.4} />
    </View>
  </TouchableOpacity>
);

const ManualLinkRow = ({onPress, signedOutSheetStyles, theme}) => (
  <TouchableOpacity
    accessibilityLabel="Enter VerusID manually"
    accessibilityRole="button"
    activeOpacity={0.74}
    onPress={onPress}
    style={signedOutSheetStyles.actionRow}>
    <View
      style={[
        signedOutSheetStyles.actionIconContainer,
        signedOutSheetStyles.actionIcon,
      ]}>
      <Pencil size={24} color={theme.colors.textPrimary} />
    </View>
    <Text numberOfLines={1} style={signedOutSheetStyles.actionLabel}>
      {'Enter VerusID manually'}
    </Text>
    <MaterialCommunityIcons
      name="chevron-right"
      size={22}
      color={theme.colors.textSubtle}
    />
  </TouchableOpacity>
);

const createStyles = theme =>
  StyleSheet.create({
    linkError: {
      color: theme.colors.danger,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 10,
      ...fontStyle('regular'),
    },
    manualStepTitle: {
      color: theme.colors.textPrimary,
      marginBottom: 10,
      ...theme.typography.titleSheet,
    },
    manualStepScrollFrame: {
      flexGrow: 0,
      flexShrink: 1,
      minHeight: 0,
    },
    manualStepScrollContent: {
      paddingBottom: 4,
    },
    manualStepActions: {
      marginTop: 12,
    },
    reviewFrame: {
      flexGrow: 0,
      flexShrink: 1,
      maxHeight: 220,
      overflow: 'hidden',
    },
    reviewFrameWithError: {
      maxHeight: 168,
    },
    searchContainer: {
      marginBottom: 10,
    },
    loadingState: {
      minHeight: 156,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      gap: 8,
    },
    loadingAnimation: {
      width: 96,
      height: 70,
    },
    skeletonState: {
      minHeight: 156,
      justifyContent: 'center',
    },
    skeletonList: {
      width: '100%',
    },
    statusState: {
      minHeight: 78,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      gap: 10,
    },
    statusText: {
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      ...fontStyle('regular'),
    },
    listFrame: {
      width: '100%',
      overflow: 'hidden',
    },
    scrollCue: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: SCROLL_CUE_HEIGHT,
    },
    scrollCueTop: {
      top: 0,
    },
    scrollCueBottom: {
      bottom: 0,
    },
    scrollCueChevron: {
      position: 'absolute',
      bottom: 2,
      alignSelf: 'center',
      width: 20,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    identityRow: {
      height: 56,
      borderRadius: 18,
      paddingHorizontal: 16,
      marginVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    identityText: {
      flex: 1,
      minWidth: 0,
      paddingRight: 10,
    },
    identityName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      ...fontStyle('semiBold'),
    },
    plusContainer: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default LinkExistingVerusIdSheet;
