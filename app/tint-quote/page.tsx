"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

const LOGO =
  "https://static.wixstatic.com/media/24f460_b5d38d3540ae4048bacb5100c4adbac4f000.jpg/v1/fill/w_596,h_209,al_c,lg_1,q_80,usm_0.33_1.00_0.00,enc_avif,quality_auto/24f460_b5d38d3540ae4048bacb5100c4adbac4f000.jpg";

const STEPS = [
  { id: 1, label: "Customer" },
  { id: 2, label: "Vehicle" },
  { id: 3, label: "Tint" },
  { id: 4, label: "Finish" },
];

const VEHICLE_TYPES = [
  "Sedan",
  "Coupe",
  "SUV",
  "Truck",
  "Tesla / EV",
  "Exotic",
  "Commercial",
];

const inputClass =
  "w-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all duration-500 placeholder:text-white/25 focus:border-[var(--accent-dim)] focus:bg-white/[0.05] focus:shadow-[0_0_24px_var(--accent-glow)]";

const labelClass = "label-mono mb-2 block text-white/50";

function RequiredMark() {
  return <span className="text-[var(--accent)] opacity-80"> *</span>;
}

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={labelClass}>
      {children}
      {required && <RequiredMark />}
    </label>
  );
}

function SectionIntro({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8 sm:mb-10">
      <span className="label-mono mb-2 block text-[var(--accent)] opacity-60">
        {step}
      </span>
      <h2 className="text-xl font-light tracking-tight text-white/90 sm:text-2xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/35">
          {description}
        </p>
      )}
    </div>
  );
}

function RadioGroup({
  name,
  value,
  onChange,
  options,
  columns = "sm:grid-cols-3",
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  columns?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-3 ${columns}`}>
      {options.map((option) => {
        const id = `${name}-${option.replace(/[/\s]+/g, "-").toLowerCase()}`;
        const checked = value === option;
        return (
          <label
            key={option}
            htmlFor={id}
            className={`panel flex cursor-pointer items-center gap-3 p-4 transition-all duration-500 hover:-translate-y-px ${
              checked
                ? "border-[var(--accent-dim)] bg-white/[0.06] shadow-[0_0_24px_var(--accent-glow)]"
                : ""
            }`}
          >
            <input
              type="radio"
              id={id}
              name={name}
              value={option}
              checked={checked}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border transition-colors duration-500 ${
                checked
                  ? "border-[var(--accent)] bg-[var(--accent)]"
                  : "border-white/20 bg-transparent"
              }`}
              aria-hidden="true"
            >
              {checked && <span className="h-1 w-1 bg-white" />}
            </span>
            <span className="text-sm text-white/80">{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function BinaryChoice({
  name,
  label,
  value,
  onChange,
  required,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <p className={labelClass}>
        {label}
        {required && <RequiredMark />}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {["Yes", "No"].map((option) => {
          const id = `${name}-${option.toLowerCase()}`;
          const checked = value === option;
          return (
            <label
              key={option}
              htmlFor={id}
              className={`panel group relative flex cursor-pointer flex-col items-center justify-center gap-2 p-6 transition-all duration-500 hover:-translate-y-0.5 sm:p-8 ${
                checked
                  ? "border-[var(--accent-dim)] bg-white/[0.06] shadow-[0_0_28px_var(--accent-glow)]"
                  : ""
              }`}
            >
              <input
                type="radio"
                id={id}
                name={name}
                value={option}
                checked={checked}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              <span
                className={`text-lg font-light tracking-wide transition-colors duration-500 sm:text-xl ${
                  checked ? "text-white" : "text-white/50 group-hover:text-white/70"
                }`}
              >
                {option}
              </span>
              <span
                className={`h-px w-0 bg-[var(--accent)] opacity-60 transition-all duration-700 ${
                  checked ? "w-6" : "group-hover:w-4"
                }`}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function VehicleConfiguratorStrip({
  year,
  make,
  model,
  color,
  vehicleType,
}: {
  year: string;
  make: string;
  model: string;
  color: string;
  vehicleType: string;
}) {
  const hasIdentity = year || make || model;
  const identity = [year, make, model].filter(Boolean).join(" ");
  const details = [vehicleType, color].filter(Boolean).join(" · ");

  return (
    <div className="panel relative overflow-hidden p-5 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_50%,rgba(201,0,0,0.06)_0%,transparent_55%)]" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="label-mono mb-2 block text-white/25">
            Your Configuration
          </span>
          <p className="text-[clamp(1rem,2.5vw,1.25rem)] font-light tracking-tight text-white/90">
            {hasIdentity ? identity : "Configure your vehicle"}
          </p>
          {details && (
            <p className="mt-1 text-sm text-white/40">{details}</p>
          )}
        </div>
        <div className="hidden h-px w-12 bg-[var(--accent)] opacity-40 sm:block" />
        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
          <span className="label-mono text-white/20">Step 02</span>
          <span className="label-mono text-white/35">Vehicle Spec</span>
        </div>
      </div>
    </div>
  );
}

export default function TintQuotePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoDragActive, setPhotoDragActive] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    contactMethod: "",
    contactTime: "",
    year: "",
    make: "",
    model: "",
    vehicleColor: "",
    vehicleType: "",
    currentTint: "",
    needTintRemoval: "",
    vehicleNotes: "",
    tintScope: "",
    tintLevel: "",
    mainPriority: "",
    tintNotes: "",
    timeline: "",
  });

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canContinue = () => {
    switch (step) {
      case 1:
        return (
          form.firstName.trim() &&
          form.lastName.trim() &&
          form.phone.trim() &&
          form.contactMethod &&
          form.contactTime
        );
      case 2:
        return (
          form.year.trim() &&
          form.make.trim() &&
          form.model.trim() &&
          form.vehicleType &&
          form.currentTint &&
          form.needTintRemoval
        );
      case 3:
        return form.tintScope && form.tintLevel && form.mainPriority;
      case 4:
        return form.timeline;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canContinue()) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    setPhotos((prev) => [...prev, ...Array.from(files)]);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addPhotos(e.target.files);
    e.target.value = "";
  };

  const handlePhotoDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setPhotoDragActive(false);
    addPhotos(e.dataTransfer.files);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canContinue() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/tint-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          photoCount: photos.length,
          photoNames: photos.map((file) => file.name),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to submit your quote request.",
        );
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/[0.06] bg-black/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="relative z-10">
            <Image
              src={LOGO}
              alt="AutoDV8ions"
              width={120}
              height={42}
              className="h-7 w-auto opacity-90 transition-opacity duration-500 hover:opacity-100 sm:h-8"
              priority
            />
          </Link>
          <Link
            href="/"
            className="label-mono link-underline text-white/40"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="atmosphere atmosphere-dark relative min-h-screen pt-24 pb-16 sm:pt-28 sm:pb-24">
        <div className="relative z-10 mx-auto max-w-3xl px-5 sm:px-8">
          {/* Intro */}
          <div className="mb-10 sm:mb-14">
            <span className="label-mono mb-4 block text-white/40">
              // Tint Quote
            </span>
            <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-light leading-[1.08] tracking-[-0.02em]">
              Get your tint quote.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/45 sm:text-base">
              A few details about you and your vehicle — we&apos;ll follow up
              with a personalized quote. No obligation.
            </p>
            <span className="accent-line mt-6" />
          </div>

          {/* Progress */}
          <div className="mb-10 sm:mb-12">
            <div className="flex items-center justify-between gap-2">
              {STEPS.map((s, i) => {
                const active = step === s.id;
                const done = step > s.id;
                return (
                  <div key={s.id} className="flex flex-1 items-center gap-2">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div
                        className={`flex h-8 w-8 items-center justify-center border text-xs transition-all duration-500 ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 text-white"
                            : done
                              ? "border-[var(--accent-dim)] bg-white/[0.05] text-white/70"
                              : "border-white/10 bg-white/[0.02] text-white/30"
                        }`}
                      >
                        {done ? "✓" : s.id}
                      </div>
                      <span
                        className={`label-mono hidden text-[0.55rem] sm:block ${
                          active ? "text-white/60" : "text-white/25"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`mb-6 h-px flex-1 transition-colors duration-500 ${
                          done ? "bg-[var(--accent-dim)]" : "bg-white/10"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {submitted ? (
            <div className="panel relative overflow-hidden p-8 text-center sm:p-12">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(201,0,0,0.06)_0%,transparent_60%)]" />
              <div className="relative">
                <span className="label-mono mb-4 block text-[var(--accent)] opacity-70">
                  Quote Request Received
                </span>
                <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-light tracking-[-0.02em]">
                  We&apos;ll be in touch soon.
                </h2>
                <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/45">
                  Thanks, {form.firstName}. Our team will reach out via{" "}
                  {form.contactMethod.toLowerCase()} during your preferred{" "}
                  {form.contactTime.toLowerCase()} window.
                </p>
                <span className="accent-line mx-auto mt-8" />
                <Link
                  href="/"
                  className="label-mono mt-10 inline-block link-underline text-white/40"
                >
                  Return to homepage
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Step 1 — Customer Info */}
              {step === 1 && (
                <section className="panel p-6 sm:p-8">
                  <div className="mb-8">
                    <span className="label-mono mb-2 block text-[var(--accent)] opacity-60">
                      Step 01
                    </span>
                    <h2 className="text-xl font-light tracking-tight text-white/90 sm:text-2xl">
                      Customer Info
                    </h2>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="firstName" required>
                        First Name
                      </FieldLabel>
                      <input
                        id="firstName"
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(e) => update("firstName", e.target.value)}
                        className={inputClass}
                        autoComplete="given-name"
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="lastName" required>
                        Last Name
                      </FieldLabel>
                      <input
                        id="lastName"
                        type="text"
                        required
                        value={form.lastName}
                        onChange={(e) => update("lastName", e.target.value)}
                        className={inputClass}
                        autoComplete="family-name"
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="phone" required>
                        Phone
                      </FieldLabel>
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        className={inputClass}
                        autoComplete="tel"
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        className={inputClass}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="mt-8">
                    <p className={labelClass}>
                      Best Way To Reach You
                      <RequiredMark />
                    </p>
                    <RadioGroup
                      name="contactMethod"
                      value={form.contactMethod}
                      onChange={(v) => update("contactMethod", v)}
                      options={["Text", "Call", "Email"]}
                      columns="sm:grid-cols-3"
                    />
                  </div>

                  <div className="mt-8">
                    <p className={labelClass}>
                      Preferred Contact Time
                      <RequiredMark />
                    </p>
                    <RadioGroup
                      name="contactTime"
                      value={form.contactTime}
                      onChange={(v) => update("contactTime", v)}
                      options={["Morning", "Afternoon", "Evening"]}
                      columns="sm:grid-cols-3"
                    />
                  </div>
                </section>
              )}

              {/* Step 2 — Vehicle */}
              {step === 2 && (
                <section className="space-y-6 sm:space-y-8">
                  <VehicleConfiguratorStrip
                    year={form.year}
                    make={form.make}
                    model={form.model}
                    color={form.vehicleColor}
                    vehicleType={form.vehicleType}
                  />

                  {/* Identity */}
                  <div className="panel p-6 sm:p-8">
                    <SectionIntro
                      step="Step 02"
                      title="Vehicle"
                      description="Tell us what you're bringing in. We'll tailor the quote to your exact vehicle."
                    />

                    <div className="grid gap-5 sm:grid-cols-3">
                      <div>
                        <FieldLabel htmlFor="year" required>
                          Year
                        </FieldLabel>
                        <input
                          id="year"
                          type="text"
                          required
                          inputMode="numeric"
                          placeholder="2024"
                          value={form.year}
                          onChange={(e) => update("year", e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="make" required>
                          Make
                        </FieldLabel>
                        <input
                          id="make"
                          type="text"
                          required
                          placeholder="Toyota"
                          value={form.make}
                          onChange={(e) => update("make", e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="model" required>
                          Model
                        </FieldLabel>
                        <input
                          id="model"
                          type="text"
                          required
                          placeholder="Camry"
                          value={form.model}
                          onChange={(e) => update("model", e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <FieldLabel htmlFor="vehicleColor">
                        Vehicle Color
                      </FieldLabel>
                      <input
                        id="vehicleColor"
                        type="text"
                        placeholder="Black, White, etc."
                        value={form.vehicleColor}
                        onChange={(e) =>
                          update("vehicleColor", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Vehicle Type */}
                  <div className="panel p-6 sm:p-8">
                    <p className={labelClass}>
                      Vehicle Type
                      <RequiredMark />
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {VEHICLE_TYPES.map((type, index) => {
                        const id = `vehicleType-${type.replace(/[/\s]+/g, "-").toLowerCase()}`;
                        const checked = form.vehicleType === type;
                        return (
                          <label
                            key={type}
                            htmlFor={id}
                            className={`panel group relative flex cursor-pointer flex-col justify-between gap-4 p-4 transition-all duration-500 hover:-translate-y-0.5 sm:p-5 ${
                              checked
                                ? "border-[var(--accent-dim)] bg-white/[0.06] shadow-[0_0_28px_var(--accent-glow)]"
                                : ""
                            }`}
                          >
                            <input
                              type="radio"
                              id={id}
                              name="vehicleType"
                              value={type}
                              checked={checked}
                              onChange={() => update("vehicleType", type)}
                              className="sr-only"
                            />
                            <span className="label-mono text-[0.55rem] text-white/20">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span
                              className={`text-sm font-light leading-snug transition-colors duration-500 ${
                                checked
                                  ? "text-white"
                                  : "text-white/60 group-hover:text-white/80"
                              }`}
                            >
                              {type}
                            </span>
                            <span
                              className={`h-px bg-[var(--accent)] opacity-50 transition-all duration-700 ${
                                checked ? "w-full" : "w-0 group-hover:w-1/2"
                              }`}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tint Status */}
                  <div className="panel p-6 sm:p-8">
                    <p className="label-mono mb-6 block text-white/30">
                      Current Condition
                    </p>
                    <div className="grid gap-8 sm:grid-cols-2 sm:gap-6">
                      <BinaryChoice
                        name="currentTint"
                        label="Current Tint?"
                        value={form.currentTint}
                        onChange={(v) => update("currentTint", v)}
                        required
                      />
                      <BinaryChoice
                        name="needTintRemoval"
                        label="Need Tint Removal?"
                        value={form.needTintRemoval}
                        onChange={(v) => update("needTintRemoval", v)}
                        required
                      />
                    </div>
                  </div>

                  {/* Photos */}
                  <div className="panel p-6 sm:p-8">
                    <p className={labelClass}>Upload Vehicle Photos</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="sr-only"
                      id="vehiclePhotos"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setPhotoDragActive(true);
                      }}
                      onDragLeave={() => setPhotoDragActive(false)}
                      onDrop={handlePhotoDrop}
                      className={`panel flex w-full flex-col items-center justify-center gap-3 border-dashed p-8 transition-all duration-500 sm:p-10 ${
                        photoDragActive
                          ? "border-[var(--accent-dim)] bg-white/[0.06] shadow-[0_0_32px_var(--accent-glow)]"
                          : "hover:border-[var(--accent-dim)] hover:shadow-[0_0_24px_var(--accent-glow)]"
                      }`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center border border-white/10 text-xl text-white/25 transition-all duration-500 group-hover:border-white/20">
                        +
                      </span>
                      <span className="text-sm text-white/50">
                        {photos.length > 0
                          ? `${photos.length} photo${photos.length > 1 ? "s" : ""} added`
                          : "Drop photos here or tap to upload"}
                      </span>
                      <span className="label-mono text-white/25">
                        Optional · JPG, PNG, HEIC
                      </span>
                    </button>

                    {photos.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {photos.map((file, index) => (
                          <li
                            key={`${file.name}-${index}`}
                            className="panel flex items-center justify-between gap-3 px-4 py-3 transition-all duration-500 hover:border-white/12"
                          >
                            <span className="truncate text-sm text-white/50">
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="label-mono shrink-0 text-white/25 transition-colors duration-500 hover:text-[var(--accent)]"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Additional Notes */}
                  <div className="panel p-6 sm:p-8">
                    <FieldLabel htmlFor="vehicleNotes">
                      Additional Vehicle Notes
                    </FieldLabel>
                    <p className="mb-3 text-xs text-white/30">
                      Window count, aftermarket glass, prior work, or anything
                      we should know before quoting.
                    </p>
                    <textarea
                      id="vehicleNotes"
                      rows={4}
                      value={form.vehicleNotes}
                      onChange={(e) => update("vehicleNotes", e.target.value)}
                      placeholder="e.g. Large panoramic roof, existing ceramic tint on rear, PPF on windshield..."
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </section>
              )}

              {/* Step 3 — Tint Details */}
              {step === 3 && (
                <section className="space-y-6 sm:space-y-8">
                  <div className="panel p-6 sm:p-8">
                    <SectionIntro
                      step="Step 03"
                      title="Tint Details"
                      description="Select what you need and we'll put together an accurate quote."
                    />

                    <p className={labelClass}>
                      What Do You Want Tinted?
                      <RequiredMark />
                    </p>
                    <RadioGroup
                      name="tintScope"
                      value={form.tintScope}
                      onChange={(v) => update("tintScope", v)}
                      options={[
                        "Full Vehicle",
                        "Front Windows Only",
                        "Rear Windows Only",
                        "Windshield Strip",
                        "Windshield",
                        "Not Sure",
                      ]}
                      columns="sm:grid-cols-2"
                    />
                  </div>

                  <div className="panel p-6 sm:p-8">
                    <p className={labelClass}>
                      Tint Level
                      <RequiredMark />
                    </p>
                    <RadioGroup
                      name="tintLevel"
                      value={form.tintLevel}
                      onChange={(v) => update("tintLevel", v)}
                      options={[
                        "5% Limo Dark",
                        "15%",
                        "20%",
                        "35%",
                        "50%",
                        "Match Existing Rear Tint",
                        "Not Sure / Need Advice",
                      ]}
                      columns="sm:grid-cols-2"
                    />
                  </div>

                  <div className="panel p-6 sm:p-8">
                    <p className={labelClass}>
                      Main Priority
                      <RequiredMark />
                    </p>
                    <RadioGroup
                      name="mainPriority"
                      value={form.mainPriority}
                      onChange={(v) => update("mainPriority", v)}
                      options={[
                        "Privacy",
                        "Heat Reduction",
                        "Appearance",
                        "Legal / Safe Option",
                        "Not Sure",
                      ]}
                      columns="sm:grid-cols-2 lg:grid-cols-3"
                    />
                  </div>

                  <div className="panel p-6 sm:p-8">
                    <FieldLabel htmlFor="tintNotes">
                      Anything specific you want done?
                    </FieldLabel>
                    <textarea
                      id="tintNotes"
                      rows={4}
                      value={form.tintNotes}
                      onChange={(e) => update("tintNotes", e.target.value)}
                      placeholder="Specific windows, concerns, or requests..."
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </section>
              )}

              {/* Step 4 — Timing & Notes */}
              {step === 4 && (
                <section className="space-y-8">
                  <div className="panel p-6 sm:p-8">
                    <div className="mb-8">
                      <span className="label-mono mb-2 block text-[var(--accent)] opacity-60">
                        Step 04
                      </span>
                      <h2 className="text-xl font-light tracking-tight text-white/90 sm:text-2xl">
                        Timing
                      </h2>
                    </div>

                    <p className={labelClass}>
                      Desired Timeline
                      <RequiredMark />
                    </p>
                    <RadioGroup
                      name="timeline"
                      value={form.timeline}
                      onChange={(v) => update("timeline", v)}
                      options={[
                        "ASAP",
                        "This Week",
                        "Next Week",
                        "Just Pricing",
                      ]}
                      columns="sm:grid-cols-2"
                    />
                  </div>

                  {/* Summary preview */}
                  <div className="panel p-6 sm:p-8">
                    <span className="label-mono mb-4 block text-white/30">
                      Summary
                    </span>
                    <dl className="grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="label-mono text-white/25">Contact</dt>
                        <dd className="mt-1 text-white/60">
                          {form.firstName} {form.lastName}
                        </dd>
                      </div>
                      <div>
                        <dt className="label-mono text-white/25">Vehicle</dt>
                        <dd className="mt-1 text-white/60">
                          {form.year} {form.make} {form.model}
                          {form.vehicleColor && ` · ${form.vehicleColor}`}
                        </dd>
                        {form.vehicleType && (
                          <dd className="mt-0.5 text-xs text-white/35">
                            {form.vehicleType}
                            {form.currentTint &&
                              ` · Current tint: ${form.currentTint}`}
                            {form.needTintRemoval === "Yes" &&
                              " · Removal needed"}
                          </dd>
                        )}
                      </div>
                      <div>
                        <dt className="label-mono text-white/25">Tint</dt>
                        <dd className="mt-1 text-white/60">
                          {form.tintScope || "—"}
                          {form.tintLevel && ` · ${form.tintLevel}`}
                        </dd>
                        {form.mainPriority && (
                          <dd className="mt-0.5 text-xs text-white/35">
                            Priority: {form.mainPriority}
                          </dd>
                        )}
                        {form.tintNotes && (
                          <dd className="mt-1 text-xs text-white/35">
                            {form.tintNotes}
                          </dd>
                        )}
                      </div>
                      <div>
                        <dt className="label-mono text-white/25">Timeline</dt>
                        <dd className="mt-1 text-white/60">
                          {form.timeline || "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </section>
              )}

              {submitError && (
                <div className="panel mt-8 border-[var(--accent-dim)] px-5 py-4 sm:px-6">
                  <p className="text-sm text-white/60">{submitError}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="label-mono px-4 py-3 text-white/40 transition-colors duration-500 hover:text-white disabled:opacity-30"
                  >
                    ← Back
                  </button>
                ) : (
                  <div />
                )}

                {step < STEPS.length ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canContinue() || isSubmitting}
                    className="inline-flex items-center justify-center gap-3 border border-white/15 bg-white/[0.05] px-8 py-3.5 text-xs tracking-[0.15em] uppercase text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08] hover:shadow-[0_0_32px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:bg-white/[0.05] disabled:hover:shadow-none"
                  >
                    Continue
                    <span>→</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canContinue() || isSubmitting}
                    className="inline-flex items-center justify-center gap-3 border border-white/15 bg-white/[0.05] px-8 py-3.5 text-xs tracking-[0.15em] uppercase text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08] hover:shadow-[0_0_32px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:bg-white/[0.05] disabled:hover:shadow-none"
                  >
                    {isSubmitting ? "Submitting..." : "Get My Tint Quote"}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="relative border-t border-white/[0.06] bg-black">
        <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="label-mono text-white/20">
              © {new Date().getFullYear()} AutoDV8ions
            </p>
            <a
              href="https://www.instagram.com/autodv8ions"
              target="_blank"
              rel="noopener noreferrer"
              className="label-mono link-underline text-white/30"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
