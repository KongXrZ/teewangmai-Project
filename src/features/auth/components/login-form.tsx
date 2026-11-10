"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginValues } from "@/features/auth/form-schemas";
import { signInWithPasswordAction } from "@/features/auth/server/actions";
import { AUTH_UNAVAILABLE } from "@/features/auth/errors";
import { getSafeRedirectPath } from "@/features/auth/redirects";
import { useAuth } from "./auth-provider";
import { AuthSubmitButton } from "./auth-submit-button";
import { AuthTextField } from "./auth-text-field";

type LoginFormProps = {
  redirectTo?: string;
  initialError?: string;
};

export function LoginForm({ redirectTo = "/", initialError }: LoginFormProps) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState(initialError ?? "");
  const pending = useRef(false);
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
      method="post"
      noValidate
      aria-busy={isSubmitting}
      onSubmit={(event) => {
        if (pending.current) {
          event.preventDefault();
          return;
        }
        pending.current = true;
        void handleSubmit(async (values) => {
          setError("");
          try {
            const result = await signInWithPasswordAction(values);
            if (!result.success) {
              setError(result.error ?? AUTH_UNAVAILABLE);
              return;
            }
            await refresh();
            router.replace(getSafeRedirectPath(redirectTo));
            router.refresh();
          } catch {
            setError(AUTH_UNAVAILABLE);
          }
        })(event)
          .catch(() => setError(AUTH_UNAVAILABLE))
          .finally(() => {
            pending.current = false;
          });
      }}
    >
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <fieldset disabled={isSubmitting} className="flex flex-col gap-5">
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
          placeholder="password"
          error={errors.password?.message}
          {...register("password")}
        />
      </fieldset>
      <p role="status" className="sr-only">
        {isSubmitting ? "กำลังเข้าสู่ระบบ" : ""}
      </p>
      <div className="mt-6">
        <AuthSubmitButton disabled={isSubmitting}>
          {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "Log in"}
        </AuthSubmitButton>
      </div>
    </form>
  );
}
