export interface Currency {
  code: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'GBP', name: 'Pound Sterling' },
  { code: 'CHF', name: 'Franco Svizzero' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'CNY', name: 'Renminbi' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'HUF', name: 'Forint' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'PLN', name: 'Polish Złoty' },
  { code: 'SEK', name: 'Swedish Krona' },
];

const CODES = new Set(CURRENCIES.map((c) => c.code));
export const isValidCurrencyCode = (v: string) => CODES.has(v);
