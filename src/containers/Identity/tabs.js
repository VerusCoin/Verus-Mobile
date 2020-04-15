import Home from './Home/View';
import PersonalInfo from './PersonalInfo/View';

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
    screen: PersonalInfo,
    icon: 'user-circle',
  },
];
