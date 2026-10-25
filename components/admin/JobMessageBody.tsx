"use client";

import { useState } from "react";
import { splitPlainTextEmailBody } from "@/lib/google/gmail-quote";

type JobMessageBodyProps = {
  bodyText: string;
  messageId: string;
};

export default function JobMessageBody({ bodyText, messageId }: JobMessageBodyProps) {
  const { primary, quoted } = splitPlainTextEmailBody(bodyText);
  const [showQuoted, setShowQuoted] = useState(false);

  return (
    <div className="job-comm-message-body-wrap">
      <p className="job-comm-message-body">{primary}</p>
      {quoted ? (
        <div className="job-comm-quoted-wrap">
          <button
            type="button"
            className="job-comm-quoted-toggle"
            aria-expanded={showQuoted}
            onClick={() => setShowQuoted((open) => !open)}
          >
            {showQuoted ? "Hide quoted text" : "Show quoted text"}
          </button>
          {showQuoted ? (
            <pre
              className="job-comm-quoted-body"
              id={`job-comm-quoted-${messageId}`}
            >
              {quoted}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
