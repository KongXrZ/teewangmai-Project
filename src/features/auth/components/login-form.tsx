"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { AuthSubmitButton } from "./auth-submit-button";
import { AuthTextField } from "./auth-text-field";

type LoginFormProps = {
  onSubmit?: (values: LoginValues) => void | Promise<void>;
};

export function LoginForm({ onSubmit }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        await onSubmit?.(values);
      })}
    >
      <div className="flex flex-col gap-5">
        <AuthTextField
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@kmutt.ac.th"
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthTextField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
      </div>
      <div className="mt-6">
        <AuthSubmitButton disabled={isSubmitting}>Log in</AuthSubmitButton>
      </div>
    </form>
  );
}
