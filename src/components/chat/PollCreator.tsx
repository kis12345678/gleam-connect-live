import { useState } from "react";
import { X, Plus, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props {
  onCreatePoll: (question: string, options: string[], isMultiple: boolean) => void;
  onClose: () => void;
}

export function PollCreator({ onCreatePoll, onClose }: Props) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isMultiple, setIsMultiple] = useState(false);

  const addOption = () => {
    if (options.length < 10) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    setOptions(options.map((o, i) => (i === index ? value : o)));
  };

  const handleSubmit = () => {
    const validOptions = options.filter((o) => o.trim());
    if (!question.trim() || validOptions.length < 2) return;
    onCreatePoll(question.trim(), validOptions, isMultiple);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-4 mb-3 shadow-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Create Poll</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
        className="mb-3"
      />

      <div className="space-y-2 mb-3">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1"
            />
            {options.length > 2 && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeOption(i)}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {options.length < 10 && (
        <Button variant="ghost" size="sm" onClick={addOption} className="text-primary mb-3">
          <Plus className="h-3 w-3 mr-1" /> Add option
        </Button>
      )}

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isMultiple}
            onChange={(e) => setIsMultiple(e.target.checked)}
            className="rounded"
          />
          Allow multiple choices
        </label>
        <div className="flex-1" />
        <Button size="sm" onClick={handleSubmit} disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}>
          Create Poll
        </Button>
      </div>
    </motion.div>
  );
}
