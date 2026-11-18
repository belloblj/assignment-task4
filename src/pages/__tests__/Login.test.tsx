import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import Login from '../Login';
import * as api from '../../services/api';

// --- Test objects (mocks) -------------------------------------------------
// No real server, storage or navigation is used: these mocks stand in for them.

jest.mock('../../services/api', () => ({
    authenticateUser: jest.fn(),
}));

jest.mock('../../services/caching', () => ({
    getFromCache: jest.fn(() => Promise.reject('not in cache')),
    setInCache: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-navigation/native', () => ({
    useIsFocused: () => true,
}));

// Layout-only wrapper that needs native code; a plain ScrollView is enough here.
jest.mock('react-native-keyboard-aware-scroll-view', () => {
    const { ScrollView } = jest.requireActual('react-native');
    return { KeyboardAwareScrollView: ScrollView };
});

const mockedAuthenticateUser = api.authenticateUser as jest.Mock;

const fakeUser = (email: string) => ({
    id: 'test-id',
    email,
    mobile: '(000) 000-0000',
    name: { first: 'Test', last: 'User' },
});

const renderLogin = () => {
    const navigation = { navigate: jest.fn() };
    const screen = render(<Login navigation={navigation as any} route={{ key: 'Login', name: 'Login' } as any} />);
    return { ...screen, navigation };
};

const logIn = (screen: ReturnType<typeof renderLogin>, email: string, password = '123456') => {
    const emailInput = screen.getByLabelText('Email');
    fireEvent.changeText(emailInput, email);
    fireEvent(emailInput, 'endEditing');

    const passwordInput = screen.getByLabelText('Password');
    fireEvent.changeText(passwordInput, password);
    fireEvent(passwordInput, 'endEditing');

    fireEvent.press(screen.getByText('Log in'));
};

beforeEach(() => {
    mockedAuthenticateUser.mockReset();
    mockedAuthenticateUser.mockImplementation((email: string) =>
        Promise.resolve({ data: { user: fakeUser(email), accessToken: 'fake-token' } })
    );
});

// --- Tests ----------------------------------------------------------------

describe('Login screen', () => {
    it.each([
        ['Luigi Carluccio', 'luigi@carluccio.it'],
        ['John Silva', 'john@silva.com.br'],
    ])('lets %s log in without an "invalid email" message', async (_name, email) => {
        const screen = renderLogin();

        logIn(screen, email);

        expect(screen.queryByText('invalid email')).toBeNull();
        expect(mockedAuthenticateUser).toHaveBeenCalledWith(email, '123456');
        await waitFor(() => expect(screen.navigation.navigate).toHaveBeenCalledWith('EventsMap'));
    });

    it('still lets a .com user log in', async () => {
        const screen = renderLogin();

        logIn(screen, 'ulla.ulriksen@example.com');

        expect(screen.queryByText('invalid email')).toBeNull();
        await waitFor(() => expect(screen.navigation.navigate).toHaveBeenCalledWith('EventsMap'));
    });

    it('sends the email trimmed and in lowercase', async () => {
        const screen = renderLogin();

        logIn(screen, '  Luigi@Carluccio.IT ');

        expect(mockedAuthenticateUser).toHaveBeenCalledWith('luigi@carluccio.it', '123456');
        await waitFor(() => expect(screen.navigation.navigate).toHaveBeenCalled());
    });

    it('shows "invalid email" and does not call the server for a bad email', () => {
        const screen = renderLogin();

        logIn(screen, 'luigi@carluccio');

        expect(screen.getByText('invalid email')).toBeTruthy();
        expect(mockedAuthenticateUser).not.toHaveBeenCalled();
    });

    it('shows "invalid password" and does not call the server for a short password', () => {
        const screen = renderLogin();

        logIn(screen, 'ulla.ulriksen@example.com', '123');

        expect(screen.queryByText('invalid email')).toBeNull();
        expect(screen.getByText('invalid password')).toBeTruthy();
        expect(mockedAuthenticateUser).not.toHaveBeenCalled();
    });
});
