"use client";

import type { FormHTMLAttributes, ReactNode } from "react";

type Props = Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  action: (formData: FormData) => void;
  message: string;
  children: ReactNode;
};

export default function ConfirmForm({ action, message, children, ...props }: Props) {
  return (
    <form
      {...props}
      action={action}
      onSubmit={(event) => {
        if (!confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
