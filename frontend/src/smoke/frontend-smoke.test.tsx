import { render, screen } from '@testing-library/react';

import { FrontendSmoke } from './frontend-smoke';

describe('FrontendSmoke', () => {
  it('renders the frontend project name', () => {
    render(<FrontendSmoke />);

    expect(screen.getByText('tax-report-frontend')).toBeInTheDocument();
  });
});
