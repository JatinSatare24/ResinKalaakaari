"use client";

// --- IMPORTS ---
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import FormError from "@/components/FormError/FormError";
import { MAX_PRODUCT_PHOTOS } from "@/lib/constants";
import { addPhotos, makeMain, movePhoto, removePhoto } from "@/lib/photo-list";
import {
  discardUploadedPhoto,
  uploadProductPhoto,
} from "@/lib/upload-product-photo";
import styles from "@/components/Admin/ProductForm/ProductForm.module.css";

// --- INTERFACES ---
export interface PhotosFieldProps {
  photos: string[]; // the list in the form right now; the first one is the main photo
  savedPhotos: string[]; // what the database has (never deleted from here)
  error?: string;
  disabled?: boolean;
  onChange: (photos: string[]) => void;
  onBusyChange: (busy: boolean) => void; // the form blocks Save while true
}

type Progress = {
  stage: "preparing" | "uploading";
  current: number;
  total: number;
};
type Action = "up" | "down" | "main" | "remove";

// --- COMPONENT ---
// The owner adds, removes and reorders a product's photos here. Reordering
// uses plain Up / Down buttons (reliable under a thumb, unlike dragging) and
// "Make main" moves a photo to the front. The list lives in the form; nothing
// is saved until the form is. A new photo is uploaded straight to storage at
// once, the same way the single photo always was.
export default function PhotosField({
  photos,
  savedPhotos,
  error,
  disabled = false,
  onChange,
  onBusyChange,
}: PhotosFieldProps) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // Said aloud to screen reader users after a button press (nothing else on
  // screen changes for them when a photo moves).
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  // Which button should have keyboard focus once the list has been redrawn.
  // A moved photo's buttons keep working, but the one that was pressed may
  // now be disabled (an "Up" on the first photo), so we choose a new one.
  const focusAfter = useRef<{ url: string; action: Action } | null>(null);

  const busy = progress !== null;
  const full = photos.length >= MAX_PRODUCT_PHOTOS;
  const locked = disabled || busy;

  useEffect(() => {
    const target = focusAfter.current;
    if (!target) return;
    focusAfter.current = null;
    const buttons =
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        "button[data-photo]",
      );
    for (const button of buttons ?? []) {
      if (
        button.dataset.photo === target.url &&
        button.dataset.action === target.action
      ) {
        button.focus();
        return;
      }
    }
  }, [photos]);

  function setBusy(next: Progress | null) {
    setProgress(next);
    onBusyChange(next !== null);
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Reset so choosing the same file again still fires onChange.
    event.target.value = "";
    if (files.length === 0) return;

    setProblem(null);
    const room = MAX_PRODUCT_PHOTOS - photos.length;
    if (room <= 0) {
      setProblem(
        `A product can have ${MAX_PRODUCT_PHOTOS} photos at most. Remove one to add another.`,
      );
      return;
    }
    const chosen = files.slice(0, room);
    const notAdded = files.length - chosen.length;

    // One after the other: a phone on mobile data copes better than with
    // several uploads at once, and the order stays the order they were picked.
    const uploaded: string[] = [];
    const failures: string[] = [];
    for (const [index, file] of chosen.entries()) {
      try {
        const url = await uploadProductPhoto(file, (stage) =>
          setBusy({ stage, current: index + 1, total: chosen.length }),
        );
        uploaded.push(url);
      } catch (caught) {
        failures.push(
          caught instanceof Error
            ? caught.message
            : "Something went wrong with that photo.",
        );
      }
    }
    setBusy(null);

    if (uploaded.length > 0) {
      onChange(addPhotos(photos, uploaded, MAX_PRODUCT_PHOTOS).list);
      setAnnouncement(
        `${uploaded.length} ${uploaded.length === 1 ? "photo" : "photos"} added.`,
      );
    }

    const messages: string[] = [];
    if (failures.length === 1) messages.push(failures[0]);
    else if (failures.length > 1) {
      messages.push(
        `${failures.length} photos could not be added. ${failures[0]}`,
      );
    }
    if (notAdded > 0) {
      messages.push(
        `Only ${room} more ${room === 1 ? "photo fits" : "photos fit"}, so ${notAdded} ${notAdded === 1 ? "was" : "were"} not added.`,
      );
    }
    if (messages.length > 0) setProblem(messages.join(" "));
  }

  function move(index: number, direction: -1 | 1) {
    const url = photos[index];
    const next = movePhoto(photos, index, direction);
    const newIndex = index + direction;
    // Keep focus on the same kind of button, unless the photo reached an end
    // and that button is now disabled.
    const atEnd =
      direction === -1 ? newIndex === 0 : newIndex === photos.length - 1;
    const action: Action = atEnd
      ? direction === -1
        ? "down"
        : "up"
      : direction === -1
        ? "up"
        : "down";
    focusAfter.current = { url, action };
    setAnnouncement(
      `Photo moved to position ${newIndex + 1} of ${photos.length}.`,
    );
    setProblem(null);
    onChange(next);
  }

  function setMain(index: number) {
    focusAfter.current = { url: photos[index], action: "down" };
    setAnnouncement("This photo is now the main photo.");
    setProblem(null);
    onChange(makeMain(photos, index));
  }

  function remove(index: number) {
    const url = photos[index];
    // Taken off before it was ever saved: it is unused, so remove the file.
    if (!savedPhotos.includes(url)) void discardUploadedPhoto(url);
    setAnnouncement(
      `Photo removed. ${photos.length - 1} of ${MAX_PRODUCT_PHOTOS} photos.`,
    );
    setProblem(null);
    onChange(removePhoto(photos, index));
    // The removed row is gone: continue from the add button.
    queueMicrotask(() => addButtonRef.current?.focus());
  }

  const message = problem ?? error;
  const label = progress
    ? progress.stage === "preparing"
      ? `Preparing photo ${progress.current} of ${progress.total}...`
      : `Uploading photo ${progress.current} of ${progress.total}...`
    : photos.length === 0
      ? "Add photos"
      : "Add more photos";

  return (
    <div className={styles.field}>
      <span className={styles.label} id="photos-label">
        Photos
      </span>
      <p className={styles.hint} id="photos-hint">
        The first photo is the main photo: the one customers see in the shop and
        the cart. {photos.length} of {MAX_PRODUCT_PHOTOS} photos.
      </p>

      {photos.length > 0 && (
        <ol
          ref={listRef}
          className={styles.photoList}
          aria-labelledby="photos-label"
        >
          {photos.map((photo, index) => {
            const last = index === photos.length - 1;
            return (
              <li
                key={photo}
                className={
                  index === 0
                    ? `${styles.photoItem} ${styles.photoItemMain}`
                    : styles.photoItem
                }
              >
                <Image
                  src={photo}
                  alt=""
                  width={72}
                  height={72}
                  className={styles.photoThumb}
                />
                <div className={styles.photoBody}>
                  <p className={styles.photoLabel}>
                    {index === 0 ? "Main photo" : `Photo ${index + 1}`}
                  </p>
                  <div className={styles.photoActions}>
                    <button
                      type="button"
                      className={styles.smallButton}
                      data-photo={photo}
                      data-action="up"
                      onClick={() => move(index, -1)}
                      disabled={locked || index === 0}
                      aria-label={`Move photo ${index + 1} up`}
                    >
                      <span aria-hidden="true">↑ </span>Up
                    </button>
                    <button
                      type="button"
                      className={styles.smallButton}
                      data-photo={photo}
                      data-action="down"
                      onClick={() => move(index, 1)}
                      disabled={locked || last}
                      aria-label={`Move photo ${index + 1} down`}
                    >
                      <span aria-hidden="true">↓ </span>Down
                    </button>
                    {index > 0 && (
                      <button
                        type="button"
                        className={styles.smallButton}
                        data-photo={photo}
                        data-action="main"
                        onClick={() => setMain(index)}
                        disabled={locked}
                        aria-label={`Make photo ${index + 1} the main photo`}
                      >
                        Make main
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${styles.smallButton} ${styles.removeButton}`}
                      data-photo={photo}
                      data-action="remove"
                      onClick={() => remove(index)}
                      disabled={locked}
                      aria-label={`Remove photo ${index + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <input
        ref={inputRef}
        id="photos"
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className="sr-only"
        aria-labelledby="photos-label"
        aria-describedby={message ? "photos-error" : "photos-hint"}
        disabled={locked || full}
        tabIndex={-1}
      />
      <button
        ref={addButtonRef}
        type="button"
        className={styles.photoButton}
        onClick={() => inputRef.current?.click()}
        disabled={locked || full}
        aria-describedby={message ? "photos-error" : "photos-hint"}
      >
        {label}
      </button>
      {full && !busy && (
        <p className={styles.hint}>
          That is the most a product can have. Remove one to add another.
        </p>
      )}

      {/* Spoken, not shown: confirms what a button press just did. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {message && <FormError id="photos-error">{message}</FormError>}
    </div>
  );
}
