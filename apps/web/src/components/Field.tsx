import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-700 mb-1">
      {children}
    </label>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-xs text-red-600 mt-1">{children}</p>;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className = '', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`w-full rounded border px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 min-h-[44px] disabled:bg-gray-100 disabled:text-gray-400 ${
        invalid ? 'border-red-400' : 'border-gray-300'
      } ${className}`}
      {...rest}
    />
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className = '', children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={`w-full rounded border px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 min-h-[44px] disabled:bg-gray-100 disabled:text-gray-400 ${
        invalid ? 'border-red-400' : 'border-gray-300'
      } ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className = '', ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={`w-full rounded border px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 ${
        invalid ? 'border-red-400' : 'border-gray-300'
      } ${className}`}
      {...rest}
    />
  );
});

export const Checkbox = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }
>(function Checkbox({ label, ...rest }, ref) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none min-h-[44px]">
      <input
        ref={ref}
        type="checkbox"
        className="w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
        {...rest}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
});

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg border shadow-sm">
      <header className="px-4 sm:px-5 py-3 border-b">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </header>
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function PrimaryButton({
  children,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...(rest as any)}
      className={`inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded bg-cyan-700 text-white text-sm font-medium hover:bg-cyan-800 active:bg-cyan-900 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...(rest as any)}
      className={`inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...(rest as any)}
      className={`inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:bg-red-800 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
