"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Avatar from "@mui/material/Avatar";
import Dialog from "@mui/material/Dialog";
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { Spinner } from "@/features/quick-scan/components/spinner";
import { AVATAR_MAX_BYTES, checkAvatar } from "../avatar";
import { editProfileSchema, type EditProfileValues } from "../form-schemas";
import {
  DEFAULT_DELETE_AVATAR_ERROR,
  getAvatarDeleteAction,
} from "./avatar-delete-client";
import {
  PageHeader,
  dangerOutlineButtonClass,
  dangerPrimaryButtonClass,
  pageMainClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./profile-ui";

export interface EditProfileInitial {
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface EditProfileSubmit {
  name: string;
  avatarFile: File | null;
}

export type EditProfileStatus = "idle" | "saving" | "saved" | "failed";
export type DeleteAvatarStatus = "idle" | "deleting" | "failed";

export interface EditProfilePageProps {
  initial: EditProfileInitial;
  status: EditProfileStatus;
  onSubmit: (values: EditProfileSubmit) => void;
  onBack: () => void;
  onCancel: () => void;
  onDone: () => void;
  onDismissError: () => void;
  errorMessage?: string | null;
  deleteStatus?: DeleteAvatarStatus;
  deleteErrorMessage?: string | null;
  onDeleteAvatar?: () => Promise<boolean>;
  onClearDraftAvatar?: () => void;
  onDismissDeleteError?: () => void;
}

const fieldClass =
  "h-[52px] w-full rounded-[14px] border bg-white px-4 text-base text-[#141414] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea580c] disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]";

export function EditProfilePage({
  initial,
  status,
  onSubmit,
  onBack,
  onCancel,
  onDone,
  onDismissError,
  errorMessage = null,
  deleteStatus = "idle",
  deleteErrorMessage = null,
  onDeleteAvatar,
  onClearDraftAvatar,
  onDismissDeleteError,
}: EditProfilePageProps) {
  const nameId = useId();
  const emailId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const pickRef = useRef(0);
  const submitLockRef = useRef(false);
  const deleteLockRef = useRef(false);
  const mountedRef = useRef(true);
  const saving = status === "saving";
  const deleting = deleteStatus === "deleting";
  const busy = saving || deleting;
  const deleteAction = getAvatarDeleteAction({
    savedAvatarUrl: initial.avatarUrl,
    hasLocalFile: Boolean(avatarFile || previewUrl),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    values: { name: initial.name },
    resetOptions: { keepDirtyValues: true },
  });

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (status !== "saving") submitLockRef.current = false;
  }, [status]);

  useEffect(() => {
    mountedRef.current = true;
    const picks = pickRef;
    return () => {
      mountedRef.current = false;
      picks.current += 1;
    };
  }, []);

  function clearDraftAvatar() {
    pickRef.current += 1;
    setAvatarFile(null);
    setPreviewUrl(null);
    setFileError(null);
    onClearDraftAvatar?.();
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const pick = ++pickRef.current;
    const check =
      file.size > AVATAR_MAX_BYTES
        ? checkAvatar(new Uint8Array(AVATAR_MAX_BYTES + 1))
        : checkAvatar(new Uint8Array(await file.slice(0, 8).arrayBuffer()));
    if (pick !== pickRef.current) return;
    if (!check.ok) {
      setFileError(check.error);
      return;
    }
    setFileError(null);
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function submit(values: EditProfileValues) {
    if (busy || submitLockRef.current) return;
    submitLockRef.current = true;
    onSubmit({ name: values.name, avatarFile });
  }

  function handleDone() {
    clearDraftAvatar();
    onDone();
  }

  function handleCancel() {
    reset({ name: initial.name });
    clearDraftAvatar();
    onCancel();
  }

  function handleDeleteButtonClick() {
    if (busy || !deleteAction.visible) return;
    if (deleteAction.mode === "clear-draft") {
      clearDraftAvatar();
      return;
    }
    setConfirmDeleteOpen(true);
  }

  function handleCloseDeleteDialog() {
    if (deleting) return;
    setConfirmDeleteOpen(false);
  }

  function handleClearDraftOnly() {
    if (deleting) return;
    clearDraftAvatar();
    setConfirmDeleteOpen(false);
  }

  async function runDeleteAvatar() {
    if (busy || deleteLockRef.current || !onDeleteAvatar) return;
    deleteLockRef.current = true;
    try {
      const deleted = await onDeleteAvatar();
      if (!mountedRef.current) return;
      setConfirmDeleteOpen(false);
      if (deleted) {
        clearDraftAvatar();
      }
    } finally {
      deleteLockRef.current = false;
    }
  }

  const openPicker = () => fileInputRef.current?.click();
  const submitForm = (event?: FormEvent) => handleSubmit(submit)(event);
  const nameError = errors.name?.message;

  return (
    <>
      <main aria-busy={busy || undefined} className={pageMainClass}>
        <PageHeader title="แก้ไขข้อมูลส่วนตัว" onBack={onBack} />
        <form noValidate onSubmit={submitForm} className="mt-6 flex flex-col gap-5">
          <fieldset disabled={busy} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl leading-snug font-semibold text-[#141414]">ข้อมูลบัญชีของคุณ</h2>
              <p className="text-[15px] text-[#6b7280]">
                คำแนะนำ : กรุณาอัปเดตข้อมูลให้เป็นปัจจุบันเพื่อการติดต่อที่สะดวก
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={openPicker}
                aria-label="เลือกรูปโปรไฟล์"
                className="relative cursor-pointer touch-manipulation rounded-full border-0 bg-transparent p-0 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea580c] disabled:cursor-not-allowed"
              >
                <Avatar
                  component="span"
                  src={previewUrl ?? initial.avatarUrl ?? undefined}
                  alt=""
                  sx={{
                    width: 96,
                    height: 96,
                    bgcolor: busy ? "#f3f4f6" : "#fdebe0",
                    color: busy ? "#9ca3af" : "#ea580c",
                  }}
                >
                  <PersonOutlineRounded aria-hidden="true" sx={{ fontSize: 52 }} />
                </Avatar>
                <span
                  aria-hidden="true"
                  className={`absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-white ${
                    busy ? "bg-[#9ca3af]" : "bg-[#ea580c]"
                  }`}
                >
                  <PhotoCameraOutlined sx={{ fontSize: 18 }} />
                </span>
              </button>
              <div className="flex w-full flex-col gap-2.5">
                <button type="button" onClick={openPicker} className={secondaryButtonClass}>
                  เปลี่ยนรูปโปรไฟล์
                </button>
                {deleteAction.visible && (
                  <button
                    type="button"
                    onClick={handleDeleteButtonClick}
                    className={dangerOutlineButtonClass}
                  >
                    {deleting ? (
                      <Spinner className="h-5 w-5 border-2 border-[#dc2626]/30 border-t-[#dc2626]" />
                    ) : (
                      <DeleteOutlineRounded aria-hidden="true" sx={{ fontSize: 20 }} />
                    )}
                    {deleting ? "กำลังลบรูป..." : "ลบรูปโปรไฟล์"}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFile}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
              {fileError ? (
                <FieldError>{fileError}</FieldError>
              ) : (
                <p className="text-sm text-[#6b7280]">JPG หรือ PNG ไม่เกิน 2 MB</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={nameId} className="text-base text-[#141414]">
                ชื่อ-นามสกุล
              </label>
              <input
                id={nameId}
                type="text"
                autoComplete="name"
                maxLength={50}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? `${nameId}-error` : undefined}
                className={`${fieldClass} ${nameError ? "border-[#dc2626]" : "border-[#e5e7eb]"}`}
                {...register("name")}
              />
              {nameError && <FieldError id={`${nameId}-error`}>{nameError}</FieldError>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={emailId} className="text-base text-[#141414]">
                อีเมล
              </label>
              <input
                id={emailId}
                type="email"
                value={initial.email}
                readOnly
                className="h-[52px] w-full cursor-default rounded-[14px] border border-[#e5e7eb] bg-[#f3f4f6] px-4 text-base text-[#4b5563] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea580c]"
              />
            </div>
          </fieldset>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={busy}
              className={`${primaryButtonClass} disabled:cursor-progress disabled:bg-[#f0a27f]`}
            >
              {saving && <Spinner className="h-5 w-5 border-2 border-white/40 border-t-white" />}
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className={secondaryButtonClass}
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </main>

      <ResultDialog
        open={confirmDeleteOpen && deleteStatus !== "failed"}
        tone="danger"
        icon="delete"
        title="ลบรูปโปรไฟล์"
        description={
          deleteAction.mode === "delete-saved-and-draft"
            ? "รูปที่เลือกใหม่และรูปโปรไฟล์ปัจจุบันของคุณจะถูกลบ และกลับไปใช้ไอคอนโปรไฟล์เริ่มต้น"
            : "รูปโปรไฟล์ปัจจุบันของคุณจะถูกลบ และกลับไปใช้ไอคอนโปรไฟล์เริ่มต้น"
        }
        onClose={handleCloseDeleteDialog}
      >
        <button
          type="button"
          onClick={() => void runDeleteAvatar()}
          disabled={deleting}
          className={dangerPrimaryButtonClass}
        >
          {deleting && <Spinner className="h-5 w-5 border-2 border-white/40 border-t-white" />}
          {deleting ? "กำลังลบรูป..." : "ยืนยันลบรูปโปรไฟล์"}
        </button>
        {deleteAction.mode === "delete-saved-and-draft" && (
          <button
            type="button"
            onClick={handleClearDraftOnly}
            disabled={deleting}
            className={secondaryButtonClass}
          >
            ล้างเฉพาะรูปที่เลือกใหม่
          </button>
        )}
        <button
          type="button"
          onClick={handleCloseDeleteDialog}
          disabled={deleting}
          className={secondaryButtonClass}
        >
          ยกเลิก
        </button>
      </ResultDialog>

      <ResultDialog
        open={deleteStatus === "failed"}
        tone="danger"
        title="ลบรูปโปรไฟล์ไม่สำเร็จ"
        description={deleteErrorMessage ?? DEFAULT_DELETE_AVATAR_ERROR}
        onClose={() => onDismissDeleteError?.()}
      >
        <button
          type="button"
          onClick={() => void runDeleteAvatar()}
          disabled={deleting}
          className={primaryButtonClass}
        >
          ลองอีกครั้ง
        </button>
        <button
          type="button"
          onClick={() => onDismissDeleteError?.()}
          disabled={deleting}
          className={secondaryButtonClass}
        >
          ยกเลิก
        </button>
      </ResultDialog>

      <ResultDialog
        open={status === "saved"}
        tone="success"
        title="บันทึกข้อมูลสำเร็จ"
        description="อัปเดตข้อมูลบัญชีของคุณเรียบร้อยแล้ว คุณสามารถใช้งานต่อได้ทันที"
        onClose={handleDone}
      >
        <button type="button" onClick={handleDone} className={primaryButtonClass}>
          ตกลง
        </button>
      </ResultDialog>
      <ResultDialog
        open={status === "failed"}
        tone="danger"
        title="บันทึกข้อมูลไม่สำเร็จ"
        description={errorMessage ?? "ข้อมูลของคุณยังไม่ถูกเปลี่ยนแปลง กรุณาลองอีกครั้ง"}
        onClose={onDismissError}
      >
        <button
          type="button"
          onClick={() => void submitForm()}
          className={primaryButtonClass}
        >
          ลองอีกครั้ง
        </button>
        <button type="button" onClick={onDismissError} className={secondaryButtonClass}>
          ยกเลิก
        </button>
      </ResultDialog>
      <BottomNavigation selected="profile" />
    </>
  );
}

function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-sm text-[#dc2626]">
      <ErrorOutlineRounded aria-hidden="true" sx={{ fontSize: 18 }} />
      {children}
    </p>
  );
}

function ResultDialog({
  open,
  tone,
  icon,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  tone: "success" | "danger";
  icon?: "delete";
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const Icon =
    icon === "delete"
      ? DeleteOutlineRounded
      : tone === "success"
        ? CheckRounded
        : CloseRounded;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{
        paper: {
          className:
            "!m-4 !w-full !max-w-[404px] !rounded-3xl !bg-white !shadow-[0_10px_32px_rgb(0_0_0/15%)] min-[360px]:!m-6",
        },
        backdrop: { className: "!bg-black/40" },
      }}
    >
      <div className="flex flex-col items-center gap-5 px-5 pt-8 pb-5 text-center min-[360px]:px-7">
        <span
          aria-hidden="true"
          className={`flex h-[92px] w-[92px] items-center justify-center rounded-full ${
            tone === "success" ? "bg-[#e7f6ee]" : "bg-[#fdecec]"
          }`}
        >
          <span
            className={`flex h-[68px] w-[68px] items-center justify-center rounded-full text-white ${
              tone === "success" ? "bg-[#16a34a]" : "bg-[#dc2626]"
            }`}
          >
            <Icon sx={{ fontSize: 40 }} />
          </span>
        </span>
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-xl leading-snug font-semibold text-[#141414]">
            {title}
          </h2>
          <p id={descriptionId} className="text-[15px] leading-relaxed text-balance text-[#6b7280]">
            {description}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">{children}</div>
      </div>
    </Dialog>
  );
}
