import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  createLateEntrySession,
  getLateEntryQRCodeToken,
} from "../../services/lateEntryService.js";
import "../lateEntryDialogs.css";

function LateEntryPassModal({ request, onClose }) {
  const [session, setSession] = useState(null);
  const [payload, setPayload] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const initialized = useRef(false);

  const markExpiredIfNeeded = useCallback((passError) => {
    const message = passError.message || "";
    if (
      passError.code === "22023" ||
      /pass has expired|pass can no longer be generated|session has expired|already used its two-minute pass/i.test(
        message,
      )
    ) {
      setExpired(true);
      setPayload("");
      setSecondsRemaining(0);
      return true;
    }
    return false;
  }, []);

  const refreshToken = useCallback(async (sessionId) => {
    try {
      const current = await getLateEntryQRCodeToken(sessionId);
      setPayload(current.payload);
      const offset = new Date(current.server_now).getTime() - Date.now();
      const remaining = Math.max(
        0,
        Math.ceil((new Date(current.expires_at).getTime() - (Date.now() + offset)) / 1000),
      );
      setSecondsRemaining(remaining);
      setError("");
    } catch (tokenError) {
      if (!markExpiredIfNeeded(tokenError)) {
        setError(tokenError.message || "Could not refresh the digital entry pass.");
      }
    }
  }, [markExpiredIfNeeded]);

  const startSession = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const newSession = await createLateEntrySession({ requestId: request.id });
      setSession(newSession);
      await refreshToken(newSession.session_id);
    } catch (sessionError) {
      if (!markExpiredIfNeeded(sessionError)) {
        setError(sessionError.message || "Could not create the digital entry pass.");
      }
    } finally {
      setBusy(false);
    }
  }, [markExpiredIfNeeded, refreshToken, request.id]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    startSession();
  }, [startSession]);

  useEffect(() => {
    if (!session || secondsRemaining <= 0) return undefined;
    const timer = window.setInterval(() => {
      refreshToken(session.session_id);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [refreshToken, secondsRemaining, session]);

  const formatCountdown = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="late-entry-modal-backdrop">
      <section
        className="late-entry-modal late-entry-pass-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="late-entry-pass-title"
      >
        <div className="late-entry-modal-heading">
          <div>
            <p className="eyebrow">Approved digital entry pass</p>
            <h2 id="late-entry-pass-title">Your rotating QR code</h2>
          </div>
          <button type="button" className="late-entry-modal-close" onClick={onClose}>
            Close
          </button>
        </div>
        <p>
          {request.exam_type} · {request.course_name || request.subject}{" "}
          {request.course_code ? `(${request.course_code})` : ""}
        </p>
        <p>
          {request.examination_date} ·{" "}
          {String(request.scheduled_start_time || "").slice(0, 5)}
        </p>
        {busy && <p role="status">Creating your secure pass…</p>}
        {error && (
          <p className="late-entry-modal-error" role="alert">
            {error}
          </p>
        )}
        {!busy && !error && !expired && payload && (
          <div className="late-entry-qr-wrap">
            <QRCodeSVG
              value={payload}
              size={256}
              level="M"
              includeMargin
              aria-label="Rotating digital entry pass QR code"
            />
            <strong className="late-entry-countdown" role="timer">
              {formatCountdown(secondsRemaining)}
            </strong>
            <p>The QR payload rotates every second and expires after 2 minutes.</p>
            <p className="late-entry-lens-hint">
              For testing, Google Lens can read the opaque payload. It contains no student details.
            </p>
          </div>
        )}
        {expired && (
          <div role="status" className="late-entry-modal-error">
            This two-minute pass has expired. Pass generation is disabled for this request.
          </div>
        )}
      </section>
    </div>
  );
}

export default LateEntryPassModal;
