import React from 'react';
import IdentityStateChangeCard from '../components/IdentityStateChangeCard';
import {DeepLinkReviewScrollView} from '../../components/RequestReview';

const ReviewStep = ({identityStateChange, requestCard, reviewDetails}) => (
  <DeepLinkReviewScrollView requestCard showScrollCue>
    {requestCard}
    {reviewDetails}
    <IdentityStateChangeCard change={identityStateChange} />
  </DeepLinkReviewScrollView>
);

export default ReviewStep;
