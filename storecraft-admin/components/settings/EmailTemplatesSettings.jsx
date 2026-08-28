"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_KEYS,
  EMAIL_VAR_CHIPS,
} from "@/lib/orderEmailPlan";

export function EmailTemplatesSettings({ settings, setSettings, onSave }) {
  const em = settings.emailTemplates || {};
  const [tplKey, setTplKey] = useState("orderConfirmation");
  const meta = useMemo(
    () => EMAIL_TEMPLATE_KEYS.find((t) => t.id === tplKey) || EMAIL_TEMPLATE_KEYS[0],
    [tplKey]
  );
  const defaults = DEFAULT_EMAIL_TEMPLATES[tplKey] || { subject: "", body: "" };
  const current = em[tplKey] || { subject: "", body: "" };

  function patch(next) {
    setSettings({
      ...settings,
      emailTemplates: {
        ...em,
        [tplKey]: { subject: current.subject || "", body: current.body || "", ...next },
      },
    });
  }

  function fillDefaults() {
    patch({ subject: defaults.subject, body: defaults.body });
    toast.success("Default copy loaded — save to keep it");
  }

  async function copyChip(chip) {
    try {
      await navigator.clipboard.writeText(chip);
      toast.success(`Copied ${chip}`);
    } catch {
      toast(`Insert ${chip} in the subject or body`);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        These emails send automatically: new order, payment received, tracking ID added, delivered,
        cancelled, and new account signup. Status-update emails stay off unless you enable them under
        Notifications.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 font-semibold">Template</th>
              <th className="px-3 py-2 font-semibold">When it sends</th>
              <th className="px-3 py-2 font-semibold">Subject</th>
            </tr>
          </thead>
          <tbody>
            {EMAIL_TEMPLATE_KEYS.map((row) => {
              const subj = em[row.id]?.subject || DEFAULT_EMAIL_TEMPLATES[row.id]?.subject || "";
              const active = row.id === tplKey;
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer border-t border-slate-100 dark:border-slate-800 ${
                    active ? "bg-sky-50 dark:bg-sky-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                  onClick={() => setTplKey(row.id)}
                >
                  <td className="px-3 py-2 font-medium text-sky-700 dark:text-sky-300">{row.label}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{row.when}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">{subj}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Edit template: {meta.label}
          </h3>
          <button
            type="button"
            onClick={fillDefaults}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium dark:border-slate-600"
          >
            Load default copy
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">{meta.when}</p>

        <div className="mb-3 flex flex-wrap gap-1">
          {EMAIL_VAR_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 font-mono text-[11px] text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100"
              onClick={() => copyChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        <label className="text-xs font-medium text-slate-600">Email subject</label>
        <input
          value={current.subject || ""}
          placeholder={defaults.subject}
          onChange={(e) => patch({ subject: e.target.value })}
          className="mt-1 mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />

        <label className="text-xs font-medium text-slate-600">Body</label>
        <div className="mt-2 min-h-[220px] rounded-lg border dark:border-slate-600">
          <RichTextEditor
            key={tplKey}
            variant="lite"
            content={current.body || ""}
            onChange={(html) => patch({ body: html })}
          />
        </div>

        <button
          type="button"
          onClick={() => onSave({ emailTemplates: settings.emailTemplates })}
          className="mt-4 rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white"
        >
          Save templates
        </button>
      </div>
    </div>
  );
}
