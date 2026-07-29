let mockStoredData = {};

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn(),
  },
}));

jest.mock('../../asyncStore/serviceStoredDataStorage', () => ({
  deleteServiceStoredDataForUser: jest.fn(),
  loadServiceStoredDataForUser: jest.fn(async () => ({
    ...mockStoredData,
  })),
  storeServiceStoredDataForUser: jest.fn(async data => {
    await Promise.resolve();
    mockStoredData = {...data};
    return data;
  }),
}));

jest.mock('../../auth/authBox', () => ({
  requestPassword: jest.fn(async () => 'password'),
  requestServiceStoredData: jest.fn(),
}));

jest.mock('../../seedCrypt', () => ({
  decryptkey: jest.fn((_password, value) => value),
  encryptkey: jest.fn(async (_password, value) => value),
}));

jest.mock('../../services/WyreProvider', () => ({
  __esModule: true,
  default: {
    reset: jest.fn(),
  },
}));

jest.mock('../../../actions/actions/services/creators/services', () => ({
  setServiceStored: jest.fn(data => ({type: 'SET_SERVICE_STORED', data})),
}));

import {modifyServiceStoredDataForUser} from '../../../actions/actions/services/dispatchers/services';
import {
  loadServiceStoredDataForUser,
  storeServiceStoredDataForUser,
} from '../../asyncStore/serviceStoredDataStorage';

describe('service stored data dispatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoredData = {
      giftcards: JSON.stringify({
        cards: {},
      }),
    };
  });

  it('serializes functional updates so concurrent writes are merged', async () => {
    const first = modifyServiceStoredDataForUser(
      current => ({
        ...current,
        first: true,
      }),
      'giftcards',
      'account',
    );
    const second = modifyServiceStoredDataForUser(
      current => ({
        ...current,
        second: true,
      }),
      'giftcards',
      'account',
    );

    await Promise.all([first, second]);

    expect(JSON.parse(mockStoredData.giftcards)).toEqual({
      cards: {},
      first: true,
      second: true,
    });
    expect(loadServiceStoredDataForUser).toHaveBeenCalledTimes(2);
    expect(storeServiceStoredDataForUser).toHaveBeenCalledTimes(2);
  });
});
