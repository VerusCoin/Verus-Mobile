import React, {useState} from 'react';
import {View} from 'react-native';
import SeedIntro from '../../CreateWallet/Forms/CreateSeed/Forms/SeedIntro';
import SeedWords from '../../CreateWallet/Forms/CreateSeed/Forms/SeedWords';
import CompactSetupHeader from '../../Onboard/components/CompactSetupHeader';
import {useRequestBackHandler} from '../useRequestNavigation';

// Use the same phrase pages and three-word check as onboarding. Completing
// the check advances this request without writing the card or a backup marker.
export default function WalletBackupPhrase({cancel, seed, onComplete, finishing}) {
  const [showWords, setShowWords] = useState(false);
  const [wordStep, setWordStep] = useState(0);
  const goBack = () => {
    if (!showWords) cancel();
    else if (wordStep > 0) setWordStep(step => step - 1);
    else setShowWords(false);
  };
  useRequestBackHandler(goBack, finishing, 2);
  return (
    <View style={{flex: 1}} pointerEvents={finishing ? 'none' : 'auto'}>
      {showWords ? (
        <SeedWords
          completionLabel="Continue to claim"
          formStep={wordStep}
          setFormStep={setWordStep}
          newSeed={seed}
          onBack={() => setShowWords(false)}
          onComplete={onComplete}
        />
      ) : (
        <>
          <CompactSetupHeader onBack={cancel} progress={0.2} title="Back up wallet" />
          <SeedIntro
            ensureNewSeed={async () => seed}
            onNext={() => setShowWords(true)}
            showHeader={false}
            verifyText="You will verify a few words before you claim the gift."
          />
        </>
      )}
    </View>
  );
}
