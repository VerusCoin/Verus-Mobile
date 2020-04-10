import Home from './Home/View';
import PersonalInformation from './PersonalInformation/View';

export default [
  {
    key: 'Home',
    label: 'Identity',
    pressColor: 'rgba(255, 255, 255, 0.16)',
    screen: Home,
    icon: 'home',
  },
  {
    key: 'Personal information',
    label: 'Personal information',
    pressColor: 'rgba(255, 255, 255, 0.16)',
    screen: PersonalInformation,
    icon: 'user-circle',
  },
];
