'use client';

export default function QuestionBuilder({ questions, setQuestions, allowQualifying, autoMode }) {
  function updateQuestion(key, patch) {
    setQuestions((qs) => qs.map((q) => (q._key === key ? { ...q, ...patch } : q)));
  }

  function updateOption(qKey, index, value) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q._key !== qKey) return q;
        const options = [...q.options];
        options[index] = value;
        return { ...q, options };
      })
    );
  }

  function addOption(qKey) {
    setQuestions((qs) =>
      qs.map((q) => (q._key === qKey ? { ...q, options: [...q.options, ''] } : q))
    );
  }

  function toggleQualifying(qKey, optionValue) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q._key !== qKey) return q;
        const isIn = q.qualifying.includes(optionValue);
        return {
          ...q,
          qualifying: isIn ? q.qualifying.filter((v) => v !== optionValue) : [...q.qualifying, optionValue],
        };
      })
    );
  }

  function removeQuestion(key) {
    setQuestions((qs) => qs.filter((q) => q._key !== key));
  }

  return (
    <>
      {questions.map((q, qi) => (
        <div key={q._key} className="card" style={{ background: 'var(--bg)', marginBottom: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>Question {qi + 1}</span>
            {questions.length > 1 && (
              <button type="button" onClick={() => removeQuestion(q._key)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>
                Remove
              </button>
            )}
          </div>
          <div className="field">
            <input
              value={q.questionText}
              onChange={(e) => updateQuestion(q._key, { questionText: e.target.value })}
              placeholder="Question text"
            />
          </div>
          <div className="field">
            <select
              value={q.type}
              onChange={(e) => updateQuestion(q._key, { type: e.target.value })}
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)' }}
            >
              <option value="mc">Multiple choice</option>
              <option value="text">Free text</option>
              <option value="media">Photo/video</option>
            </select>
          </div>

          {q.type === 'mc' && (
            <div style={{ marginTop: 4 }}>
              {q.options.map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(q._key, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                    style={{ flex: 1 }}
                  />
                  {allowQualifying && autoMode && opt.trim() && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={q.qualifying.includes(opt.trim())}
                        onChange={() => toggleQualifying(q._key, opt.trim())}
                      />
                      Qualifies
                    </label>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(q._key)}
                style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 6, color: 'var(--text-dim)', fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}
              >
                + Add option
              </button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
