"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  signupSchema,
  type SignupPayload,
  type SignupValues,
} from "@/features/auth/schemas";
import { AuthSubmitButton } from "./auth-submit-button";
import { AuthTextField } from "./auth-text-field";

type SignupFormProps = {
  onSubmit?: (payload: SignupPayload) => void | Promise<void>;
};

export function SignupForm({ onSubmit }: SignupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async ({ name, email, password }) => {
        await onSubmit?.({ name, email, password });
      })}
    >
      <div className="flex flex-col gap-5">
        <AuthTextField
          label="Name"
          type="text"
          autoComplete="name"
          placeholder="Name"
          error={errors.name?.message}
          {...register("name")}
        />
        <AuthTextField
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Email"
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthTextField
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="password"
          error={errors.password?.message}
          {...register("password", { deps: ["confirmPassword"] })}
        />
        <AuthTextField
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          placeholder="password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
      </div>
      <div className="mt-6">
        <AuthSubmitButton disabled={isSubmitting}>Sign up</AuthSubmitButton>
      </div>
    </form>
  );
}
