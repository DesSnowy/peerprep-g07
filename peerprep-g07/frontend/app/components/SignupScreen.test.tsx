import React from 'react';
import { render, screen } from '@testing-library/react';
import SignupScreen from './SignupScreen';

test('renders SignupScreen component', () => {
    render(<SignupScreen />);
    const linkElement = screen.getByText(/sign up/i);
    expect(linkElement).toBeInTheDocument();
});