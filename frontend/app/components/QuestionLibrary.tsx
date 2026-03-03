import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { 
  BookOpen, 
  Search, 
  Grid3x3, 
  List, 
  Plus, 
  Edit, 
  Trash2, 
  Filter,
  Image as ImageIcon,
  Play,
  TrendingUp,
  Database,
  Shield,
  User,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getQuestions, deleteQuestion } from "@/app/services/api";
import type { Question } from "@/app/services/api";

interface QuestionLibraryProps {
  onStartSession?: () => void;
  onNavigateToAddQuestion?: () => void;
}

export function QuestionLibrary({ onStartSession, onNavigateToAddQuestion }: QuestionLibraryProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: { topics?: string; difficulty?: string } = {};
      if (topicFilter) params.topics = topicFilter;
      if (difficultyFilter) params.difficulty = difficultyFilter;
      const { questions: data } = await getQuestions(params);
      setQuestions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load questions.");
    } finally {
      setIsLoading(false);
    }
  }, [topicFilter, difficultyFilter]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setDeletingId(id);
    try {
      await deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.questionId !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete question.");
    } finally {
      setDeletingId(null);
    }
  };

  // Client-side search filter (backend doesn't have text search)
  const filteredQuestions = questions.filter((q) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.title.toLowerCase().includes(query) ||
      q.description.toLowerCase().includes(query) ||
      q.topics.some((t) => t.toLowerCase().includes(query))
    );
  });

  // Collect unique topics from loaded questions for the filter dropdown
  const availableTopics = [...new Set(questions.flatMap((q) => q.topics))].sort();

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800 border-green-300";
      case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Hard": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Question Library</h1>
              <p className="text-purple-100 text-sm mt-1">Admin Management Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-white/20 text-white border-white/30 px-3 py-1.5 backdrop-blur-sm">
              <User className="w-3 h-3 mr-1.5" />
              Admin Access
            </Badge>
            <Button className="bg-white text-purple-600 hover:bg-purple-50 h-10" onClick={onNavigateToAddQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Question
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="border-4 border-gray-300 rounded-lg p-5 bg-white">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Label htmlFor="search" className="text-gray-700 mb-2 block">Search Questions</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                id="search"
                placeholder="Search by title or topic..."
                className="pl-10 border-2 border-gray-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Topic Filter */}
          <div className="w-full lg:w-48">
            <Label htmlFor="topic-filter" className="text-gray-700 mb-2 block">Topic</Label>
            <select 
              id="topic-filter"
              className="w-full h-10 px-3 border-2 border-gray-300 rounded-md bg-white"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
            >
              <option value="">All Topics</option>
              {availableTopics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="w-full lg:w-48">
            <Label htmlFor="difficulty-filter" className="text-gray-700 mb-2 block">Difficulty</Label>
            <select 
              id="difficulty-filter"
              className="w-full h-10 px-3 border-2 border-gray-300 rounded-md bg-white"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
            >
              <option value="">All Levels</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="w-full lg:w-auto">
            <Label className="text-gray-700 mb-2 block">View</Label>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-blue-600" : "border-2 border-gray-300"}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-blue-600" : "border-2 border-gray-300"}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Admin Controls */}
        <div className="flex gap-2 mt-4 pt-4 border-t-2 border-gray-200">
          <Badge variant="secondary" className="text-xs">Admin Controls:</Badge>
          <Button variant="outline" size="sm" className="border-2 border-gray-300">
            <Plus className="mr-1 h-3 w-3" />
            Add Question
          </Button>
          <Button variant="outline" size="sm" className="border-2 border-gray-300">
            <Edit className="mr-1 h-3 w-3" />
            Update
          </Button>
          <Button variant="outline" size="sm" className="border-2 border-gray-300">
            <Trash2 className="mr-1 h-3 w-3" />
            Remove
          </Button>
        </div>
      </div>

      {/* Questions Display */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading questions...</span>
        </div>
      ) : error ? (
        <div className="p-6 border-2 border-red-200 rounded-lg bg-red-50 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700">{error}</p>
          <Button variant="outline" className="mt-3 border-2 border-red-300" onClick={fetchQuestions}>
            Retry
          </Button>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="p-6 border-2 border-gray-200 rounded-lg bg-gray-50 text-center">
          <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No questions found.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuestions.map((question) => (
            <div 
              key={question.questionId}
              className="border-4 border-gray-300 rounded-lg p-5 bg-white hover:border-blue-400 transition-colors cursor-pointer group"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono border-gray-400 text-gray-600">
                        Q{question.questionId}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900">{question.title}</h3>
                  </div>
                  {question.imageUrls && question.imageUrls.length > 0 && (
                    <div className="flex-shrink-0 p-1 border-2 border-gray-300 rounded">
                      <ImageIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={`border ${getDifficultyColor(question.difficulty)}`}>
                    {question.difficulty}
                  </Badge>
                  {question.topics.map((t) => (
                    <Badge key={t} variant="secondary" className="border border-gray-300">
                      {t}
                    </Badge>
                  ))}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-2">{question.description}</p>

                {/* Admin Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                    onClick={() => handleDelete(question.questionId)}
                    disabled={deletingId === question.questionId}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {deletingId === question.questionId ? "Deleting..." : "Remove"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((question) => (
            <div 
              key={question.questionId}
              className="border-4 border-gray-300 rounded-lg p-5 bg-white hover:border-blue-400 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                {/* Image Indicator */}
                <div className="w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0">
                  {question.imageUrls && question.imageUrls.length > 0 ? (
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  ) : (
                    <BookOpen className="h-8 w-8 text-gray-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs font-mono border-gray-400 text-gray-600">
                      Q{question.questionId}
                    </Badge>
                    <h3 className="font-semibold text-gray-900">{question.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{question.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`border text-xs ${getDifficultyColor(question.difficulty)}`}>
                      {question.difficulty}
                    </Badge>
                    {question.topics.map((t) => (
                      <Badge key={t} variant="secondary" className="border border-gray-300 text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Admin Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                    onClick={() => handleDelete(question.questionId)}
                    disabled={deletingId === question.questionId}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    {deletingId === question.questionId ? "Deleting..." : "Remove"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Info Note */}
      <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50 text-center">
        <div className="text-sm text-purple-800">
          <p className="font-semibold mb-1 flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Admin Management View
          </p>
          <p>This page is accessible only to administrators. Add, edit, or remove coding questions from the library.</p>
        </div>
      </div>
    </div>
  );
}