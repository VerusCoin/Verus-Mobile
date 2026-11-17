import React from 'react';
import ProgressHeader from '../../../components/ProgressHeader';

const CompactSetupHeader = ({onBack, progress = 0.25, rightAction, title}) => {
  return (
    <ProgressHeader
      onBack={onBack}
      progress={progress}
      rightAction={rightAction}
      title={title}
    />
  );
};

export default CompactSetupHeader;
