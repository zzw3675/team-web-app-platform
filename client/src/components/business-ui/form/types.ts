import type { ReactNode } from 'react';

export type FieldLayoutStyles = Record<
  'root' | 'label' | 'description' | 'error',
  React.CSSProperties
>;
export type FieldLayoutClassNames = Record<
  'root' | 'label' | 'description' | 'error',
  string
>;

export interface FieldLayoutProps {
  label?: ReactNode;
  placeholder?: string;
  description?: string | undefined;
  isInvalid?: boolean;
  errorMessage?: string;
  layout?: 'horizontal' | 'vertical' | 'responsive';
  name?: string;
  required?: boolean;
  classNames?: Partial<FieldLayoutClassNames>;
  styles?: Partial<FieldLayoutStyles>;
}

export interface CommonFieldProps {
  label?: ReactNode;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  required?: boolean;
  layout?: 'horizontal' | 'vertical' | 'responsive';
}
