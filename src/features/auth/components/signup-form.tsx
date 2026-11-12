"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithPasswordAction } from "@/features/auth/server/actions";
import { AUTH_UNAVAILABLE } from "@/features/auth/errors";
import { useAuth } from "./auth-provider";
import { signupSchema, type SignupValues } from "@/features/auth/form-schemas";
import { AuthSubmitButton } from "./auth-submit-button";
import { AuthTextField } from "./auth-text-field";

export function SignupForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const pending = useRef(false);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
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
        void handleSubmit(async ({ name, email, password }) => {
          setError("");
          setConfirmation("");
          try {
            const result = await signUpWithPasswordAction({
              name,
              email,
              password,
            });
            if (!result.success || !result.data) {
              setError(result.error ?? AUTH_UNAVAILABLE);
              return;
            }
            if (result.data.requiresEmailConfirmation) {
              setConfirmation(
                result.message ??
                  "กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตนก่อนเข้าสู่ระบบ",
              );
              resetField("password");
              resetField("confirmPassword");
              return;
            }
            await refresh();
            router.replace("/");
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
      <p
        role="status"
        className={confirmation ? "mb-4 text-sm text-[#194569]" : "sr-only"}
      >
        {isSubmitting ? "กำลังสมัครสมาชิก..." : confirmation}
      </p>
      <fieldset disabled={isSubmitting} className="flex flex-col gap-5">
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
      </fieldset>
      <div className="mt-6">
        <AuthSubmitButton disabled={isSubmitting}>
          {isSubmitting ? "กำลังสมัครสมาชิก..." : "Sign up"}
        </AuthSubmitButton>
      </div>
    </form>
  );
}
