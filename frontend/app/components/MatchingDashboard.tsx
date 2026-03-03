import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Target,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { joinMatchQueue, getMatchStatus, cancelMatch } from "@/app/services/api";
import type { Match } from "@/app/services/api";

type MatchingState = "idle" | "searching" | "matched" | "timeout";

interface MatchingDashboardProps {
  onNavigateToCollaboration: () => void;
}

// Maps between user-friendly display values and backend API values
const TOPIC_MAP: Record<string, string> = {
  "Arrays": "arrays",
  "Linked Lists": "linked-lists",
  "Trees": "trees",
  "Graphs": "graphs",
  "Dynamic Programming": "dynamic-programming",
};
const TOPIC_DISPLAY = Object.keys(TOPIC_MAP);

const LANG_MAP: Record<string, string> = {
  "JavaScript": "javascript",
  "Python": "python",
  "Java": "java",
  "C++": "cpp",
};
const LANG_DISPLAY = Object.keys(LANG_MAP);

const DIFFICULTY_MAP: Record<string, string> = {
  "Easy": "easy",
  "Medium": "medium",
  "Hard": "hard",
};

export function MatchingDashboard({ onNavigateToCollaboration }: MatchingDashboardProps) {
  const { user } = useAuth();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Medium");
  const [selectedTopic, setSelectedTopic] = useState<string>("Arrays");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("JavaScript");
  const [matchingState, setMatchingState] = useState<MatchingState>("idle");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [usersInQueue, setUsersInQueue] = useState(0);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [error, setError] = useState("");

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userId = user ? String(user.id) : "";

  const difficulties = ["Easy", "Medium", "Hard"];

  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const handleStartMatching = async () => {
    if (!userId) {
      setError("User not authenticated.");
      return;
    }
    setError("");
    setMatchingState("searching");
    setTimeElapsed(0);
    setShowWarning(false);
    setCurrentMatch(null);

    try {
      const res = await joinMatchQueue({
        userId,
        topic: TOPIC_MAP[selectedTopic],
        difficulty: DIFFICULTY_MAP[selectedDifficulty],
        language: LANG_MAP[selectedLanguage],
      });

      if (res.status === "matched" && res.match) {
        setCurrentMatch(res.match);
        setMatchingState("matched");
        return;
      }

      // Start polling for match status
      pollIntervalRef.current = setInterval(async () => {
        try {
          const status = await getMatchStatus(userId);
          if (status.state === "matched" && status.match) {
            cleanup();
            setCurrentMatch(status.match);
            setMatchingState("matched");
          } else if (status.state === "timeout") {
            cleanup();
            setMatchingState("timeout");
          } else if (status.state === "queued") {
            setUsersInQueue(status.queueLength ?? 0);
          }
        } catch {
          // polling error — keep trying
        }
      }, 2000);

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => {
          const next = prev + 1;
          if (next >= 105) setShowWarning(true); // warn ~15s before 2-min timeout
          return next;
        });
      }, 1000);

    } catch (err: any) {
      setError(err.message || "Failed to join matching queue.");
      setMatchingState("idle");
    }
  };

  const handleCancelMatching = async () => {
    cleanup();
    try {
      if (userId) await cancelMatch(userId);
    } catch {
      // ignore cancel errors
    }
    setMatchingState("idle");
    setTimeElapsed(0);
    setShowWarning(false);
  };

  const handleRetry = () => {
    cleanup();
    setMatchingState("idle");
    setTimeElapsed(0);
    setShowWarning(false);
    setCurrentMatch(null);
  };

  useEffect(() => {
    if (matchingState === "idle") setShowWarning(false);
  }, [matchingState]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Find a Match</h1>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Matching Criteria Info Banner */}
        <div className="mb-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
          <div className="flex items-start gap-2 text-sm text-purple-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Matching Algorithm:</p>
              <p className="text-xs">Priority: Topic (highest) → Difficulty. The system matches users with identical topic preferences first.</p>
            </div>
          </div>
        </div>

        {/* Selection Panel - Only show when idle */}
        {matchingState === "idle" && (
          <div className="border-4 border-gray-300 rounded-lg p-8 bg-white space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Select Your Preferences
              </h2>
              <p className="text-gray-600">
                Choose a difficulty level, topic, and language to get matched with another user
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Difficulty Selection */}
            <div className="space-y-3">
              <Label className="text-gray-700 text-base">
                Difficulty Level
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {difficulties.map((difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() => setSelectedDifficulty(difficulty)}
                    className={`p-4 border-3 rounded-lg font-medium transition-all ${
                      selectedDifficulty === difficulty
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg">{difficulty}</div>
                      {difficulty === "Easy" && (
                        <div className="text-xs mt-1 opacity-70">Beginner friendly</div>
                      )}
                      {difficulty === "Medium" && (
                        <div className="text-xs mt-1 opacity-70">Moderate challenge</div>
                      )}
                      {difficulty === "Hard" && (
                        <div className="text-xs mt-1 opacity-70">Advanced problems</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Selection (single) */}
            <div className="space-y-3">
              <Label className="text-gray-700 text-base">
                Topic
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TOPIC_DISPLAY.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    className={`p-3 border-3 rounded-lg font-medium text-sm transition-all relative ${
                      selectedTopic === topic
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {selectedTopic === topic && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selection */}
            <div className="space-y-3">
              <Label className="text-gray-700 text-base">
                Preferred Language
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {LANG_DISPLAY.map((language) => (
                  <button
                    key={language}
                    onClick={() => setSelectedLanguage(language)}
                    className={`p-3 border-3 rounded-lg font-medium text-sm transition-all relative ${
                      selectedLanguage === language
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {selectedLanguage === language && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {language}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Preferences Summary */}
            <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Your Selection:</div>
              <div className="flex gap-3 flex-wrap">
                <Badge className="bg-blue-600 text-white px-3 py-1">
                  {selectedDifficulty}
                </Badge>
                <Badge className="bg-purple-600 text-white px-3 py-1">
                  {selectedTopic}
                </Badge>
                <Badge className="bg-green-600 text-white px-3 py-1">
                  {selectedLanguage}
                </Badge>
              </div>
            </div>

            {/* Start Matching Button */}
            <Button 
              onClick={handleStartMatching}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
            >
              <Users className="mr-2 h-5 w-5" />
              Start Matching
            </Button>
          </div>
        )}

        {/* Searching State */}
        {matchingState === "searching" && (
          <div className="border-4 border-blue-300 rounded-lg p-8 bg-white space-y-6">
            {/* Timer Badge - Top Right */}
            <div className="flex justify-end -mt-4 -mr-4 mb-2">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-bl-lg rounded-tr-lg flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-semibold">{timeElapsed}s elapsed</span>
              </div>
            </div>

            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Finding Your Match...
                </h2>
                
                <p className="text-gray-600">
                  Searching for another user with the same preferences
                </p>
              </div>

              {/* Current Selection */}
              <div className="inline-flex gap-3 flex-wrap justify-center">
                <Badge className="bg-blue-600 text-white px-4 py-2 text-base">
                  {selectedDifficulty}
                </Badge>
                <Badge className="bg-purple-600 text-white px-4 py-2 text-base">
                  {selectedTopic}
                </Badge>
                <Badge className="bg-green-600 text-white px-4 py-2 text-base">
                  {selectedLanguage}
                </Badge>
              </div>

              {/* Users in Queue Counter */}
              {usersInQueue > 0 && (
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-center justify-center gap-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <div className="text-sm text-blue-600 font-medium">
                        <span className="text-2xl font-bold">{usersInQueue}</span> {usersInQueue === 1 ? 'user' : 'users'} in queue
                      </div>
                      <div className="text-xs text-blue-500">
                        Currently searching for a match
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Indicator */}
              <div className="pt-4">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  <span>Looking for available users...</span>
                </div>
              </div>
            </div>

            {/* Timeout Warning Banner */}
            {showWarning && (
              <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg animate-pulse">
                <div className="flex items-start gap-3 text-sm text-orange-900">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-600" />
                  <div className="text-left">
                    <p className="font-semibold mb-1">Queue Timeout Warning</p>
                    <p>You may be removed from the matching queue soon if no match is found.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cancel Button */}
            <Button 
              onClick={handleCancelMatching}
              variant="outline"
              className="w-full border-2 border-gray-300 h-11"
            >
              Cancel Matching
            </Button>
          </div>
        )}

        {/* Matched State */}
        {matchingState === "matched" && (
          <div className="border-4 border-green-300 rounded-lg p-8 bg-white space-y-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-800">
                Match Found!
              </h2>
              
              <p className="text-gray-600">
                You've been matched with another user
              </p>

              {/* Matched User Info */}
              <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-16 h-16 border-3 border-gray-400 rounded-full flex items-center justify-center bg-gray-100">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 text-lg">
                      {currentMatch ? `Matched User` : "Anonymous User"}
                    </div>
                    <div className="text-sm text-gray-600">Online now</div>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap justify-center">
                  <Badge className="bg-blue-600 text-white px-3 py-1">
                    {selectedDifficulty}
                  </Badge>
                  <Badge className="bg-purple-600 text-white px-3 py-1">
                    {selectedTopic}
                  </Badge>
                  <Badge className="bg-green-600 text-white px-3 py-1">
                    {selectedLanguage}
                  </Badge>
                </div>
              </div>

              {/* Success Message */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-blue-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    {currentMatch ? (
                      <span>Match ID: <span className="font-mono font-bold">{currentMatch.matchId.slice(0, 8)}...</span> — You will now be redirected to a collaborative workspace</span>
                    ) : (
                      <span>You will now be redirected to a collaborative workspace with an appropriate question</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={onNavigateToCollaboration}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Continue to Workspace
              </Button>
              <Button 
                onClick={handleRetry}
                variant="outline"
                className="w-full border-2 border-gray-300 h-11"
              >
                Find Another Match
              </Button>
            </div>
          </div>
        )}

        {/* Timeout State */}
        {matchingState === "timeout" && (
          <div className="border-4 border-red-300 rounded-lg p-8 bg-white space-y-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-800">
                Matching Timeout
              </h2>
              
              <p className="text-gray-600">
                No match found within the time limit
              </p>

              {/* Timeout Info */}
              <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg">
                <div className="text-sm text-red-800 mb-3">
                  We couldn't find another user with these preferences:
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  <Badge className="bg-blue-600 text-white px-3 py-1">
                    {selectedDifficulty}
                  </Badge>
                  <Badge className="bg-purple-600 text-white px-3 py-1">
                    {selectedTopic}
                  </Badge>
                  <Badge className="bg-green-600 text-white px-3 py-1">
                    {selectedLanguage}
                  </Badge>
                </div>
              </div>

              {/* Suggestions */}
              <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-yellow-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <div className="font-semibold mb-1">Suggestions:</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Try a different difficulty level</li>
                      <li>Select a more popular topic</li>
                      <li>Try again during peak hours</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Retry Button */}
            <Button 
              onClick={handleRetry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}