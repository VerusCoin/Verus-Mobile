import {DrawerActions} from '@react-navigation/compat';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {Icon} from 'react-native-elements';
import Colors from '../../globals/colors';
import {fontStyle} from '../../globals/fonts';
import styles from '../../styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import OnboardingBackButton from '../../components/OnboardingBackButton';

const Header = () => {
  const navigation = useNavigation(); // Use the hook here
  const dispatch = useDispatch();
  const showBalance = useSelector(state => state.coins.showBalance);

  const handleBalanceShow = event => {
    event.preventDefault();
    event.stopPropagation();
    dispatch({type: 'SET_BALANCE_SHOW'});
  };

  return (
    <TouchableOpacity style={{paddingRight: 8}}>
      <View
        style={{
          flexDirection: 'row',
        }}>
        {showBalance ? (
          <TouchableOpacity
            onPress={handleBalanceShow}
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <MaterialCommunityIcons
              name="eye-off"
              size={25}
              color={Colors.secondaryColor}
              style={{
                marginLeft: 5,
                marginRight: 5,
              }}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleBalanceShow}
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <MaterialCommunityIcons
              name="eye"
              size={25}
              color={Colors.secondaryColor}
              style={{
                marginLeft: 5,
                marginRight: 5,
              }}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}>
          <Icon name="menu" size={35} color={Colors.secondaryColor} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export const defaultHeaderOptions = ({navigation, params, route}) => ({
  headerShown: true,
  headerMode: 'screen',
  headerStyle: {
    backgroundColor: Colors.primaryColor,
  },
  headerTitleStyle: {
    ...fontStyle('black'),
    fontSize: 22,
    color: Colors.secondaryColor,
  },
  headerRight: () => <Header />,
  headerTintColor: Colors.secondaryColor,
});

const RedesignedHeaderRight = ({color}) => {
  const dispatch = useDispatch();
  const showBalance = useSelector(state => state.coins.showBalance);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={showBalance ? 'Hide balances' : 'Show balances'}
      onPress={() => dispatch({type: 'SET_BALANCE_SHOW'})}
      style={{width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center'}}>
      <MaterialCommunityIcons
        name={showBalance ? 'eye-off-outline' : 'eye-outline'}
        size={24}
        color={color}
      />
    </TouchableOpacity>
  );
};

// Every redesigned stack header goes back with the arrow button, never the iOS
// "‹ Back" chevron and title.
export const createRedesignedHeaderOptions = theme => ({
  headerShown: true,
  headerMode: 'screen',
  headerStyle: {
    backgroundColor: theme.colors.background,
    shadowColor: 'transparent',
    elevation: 0,
  },
  headerTitleStyle: {
    ...fontStyle('semiBold'),
    fontSize: 20,
    color: theme.colors.textPrimary,
  },
  headerTintColor: theme.colors.textPrimary,
  headerBackTitleVisible: false,
  headerLeft: ({onPress}) =>
    onPress ? <OnboardingBackButton onPress={onPress} /> : null,
  headerLeftContainerStyle: {
    paddingLeft: 16,
  },
  headerRightContainerStyle: {paddingRight: 16},
  headerRight: () => <RedesignedHeaderRight color={theme.colors.textPrimary} />,
});

export const createSettingsHeaderOptions = theme => ({
  ...createRedesignedHeaderOptions(theme),
  headerRight: () => null,
});
