import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BrainCircuit,
  Camera,
  CheckCircle2,
  ImagePlus,
  Images,
  Loader2,
  RefreshCw,
  ScanSearch,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  analyzeProblemPhoto,
  buildDescriptionLine,
  fileToAnalysisDataUrl,
  generateReferenceViews,
  type ReferenceView,
  type VisionAnalysis,
} from '@/services/aiProblemDetection';

interface Props {
  /** Extra context sent to the vision model (usually the job title/description). */
  hint?: string;
  /** Called when the customer accepts the AI result. */
  onUseResult: (line: string, analysis: VisionAnalysis) => void;
}

const FEATURES = [
  { icon: ScanSearch, label: 'CNN Vision Analysis' },
  { icon: Sparkles, label: 'Problem Area Detection' },
  { icon: Images, label: 'AI Reference Views' },
];

export default function AIProblemDetection({ hint, onUseResult }: Props) {
  const { toast } = useToast();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionAnalysis | null>(null);
  const [generating, setGenerating] = useState(false);
  const [views, setViews] = useState<ReferenceView[]>([]);
  const [applied, setApplied] = useState(false);

  const reset = () => {
    setResult(null);
    setViews([]);
    setApplied(false);
  };

  const pick = (ref: React.RefObject<HTMLInputElement>) => {
    if (ref.current) {
      ref.current.value = '';
      ref.current.click();
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please choose a photo', variant: 'destructive' });
      return;
    }
    try {
      const dataUrl = await fileToAnalysisDataUrl(file);
      reset();
      setPhoto(dataUrl);
    } catch (e) {
      toast({ title: 'Could not read that photo', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const runAnalysis = async () => {
    if (!photo) return;
    setAnalyzing(true);
    setViews([]);
    setApplied(false);
    try {
      const analysis = await analyzeProblemPhoto({ image: photo, hint });
      setResult(analysis);
    } catch (e) {
      toast({ title: 'AI analysis failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const runReferenceViews = async () => {
    if (!photo) return;
    setGenerating(true);
    try {
      const { images } = await generateReferenceViews({
        image: photo,
        problem: result?.problem ?? 'possible fault',
        category: result?.category ?? 'Other',
        views: 3,
      });
      setViews(images);
    } catch (e) {
      toast({ title: 'Could not generate reference views', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const useResult = () => {
    if (!result) return;
    onUseResult(buildDescriptionLine(result), result);
    setApplied(true);
    toast({ title: 'Added to your job description' });
  };

  return (
    <section className="space-y-3">
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="font-bold flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-primary" />
            AI Problem Detection
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Show the problem. AI helps you understand it.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 border-primary/30 text-primary bg-primary/5">
          <Sparkles className="h-3 w-3 mr-1" /> AI Powered
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {FEATURES.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground"
          >
            <Icon className="h-3 w-3 text-primary" />
            {label}
          </span>
        ))}
      </div>

      {/* ---------- 1. Upload ---------- */}
      {!photo ? (
        <div className="rounded-2xl border border-dashed border-primary/30 bg-gradient-to-br from-primary/[0.06] via-background to-background p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ScanSearch className="h-7 w-7 text-primary" />
          </div>
          <p className="font-bold text-sm">Upload Problem Photo</p>
          <p className="text-xs text-muted-foreground mt-1">Take a Photo or Upload from Gallery</p>
          <p className="text-xs text-muted-foreground/80 mt-2 max-w-xs mx-auto">
            Upload a photo and AI will analyze the visible problem.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <Button type="button" className="rounded-xl gap-2" onClick={() => pick(cameraRef)}>
              <Camera className="h-4 w-4" /> Take a Photo
            </Button>
            <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={() => pick(galleryRef)}>
              <ImagePlus className="h-4 w-4" /> Upload from Gallery
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card p-3 space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-muted">
            <img src={photo} alt="Uploaded problem photo" className="w-full max-h-72 object-contain" />

            {/* Detected problem area highlight */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="pointer-events-none absolute rounded-lg border-2 border-primary shadow-[0_0_0_9999px_hsl(var(--background)/0.35)]"
                  style={{
                    left: `${result.region.x * 100}%`,
                    top: `${result.region.y * 100}%`,
                    width: `${result.region.width * 100}%`,
                    height: `${result.region.height * 100}%`,
                  }}
                >
                  <span className="absolute -top-6 left-0 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Detected area
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {analyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/70 backdrop-blur-sm">
                <motion.div
                  animate={{ y: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute left-0 h-0.5 w-full bg-primary/70"
                />
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm font-semibold">Analyzing with CNN…</p>
                <p className="text-xs text-muted-foreground">Detecting possible problem areas…</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!result && (
              <Button type="button" className="rounded-xl gap-2 flex-1" onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                {analyzing ? 'Analyzing…' : 'Analyze with AI'}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => pick(cameraRef)}
              disabled={analyzing}
            >
              <RefreshCw className="h-4 w-4" /> Retake
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                setPhoto(null);
                reset();
              }}
              disabled={analyzing}
            >
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          </div>
        </div>
      )}

      {/* ---------- 2. Result ---------- */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-background p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Detected problem</p>
                <p className="font-bold">{result.problem}</p>
              </div>
              <Badge variant="outline" className="shrink-0 border-primary/30 text-primary bg-primary/5">
                {result.category}
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-semibold">{result.confidence}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.confidence}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{result.explanation}</p>

            <Button
              type="button"
              className="w-full rounded-xl gap-2"
              onClick={useResult}
              variant={applied ? 'outline' : 'default'}
            >
              <CheckCircle2 className="h-4 w-4" />
              {applied ? 'Added to description' : 'Use AI Result'}
            </Button>

            <p className="text-[11px] text-muted-foreground/90">
              AI result is an estimate. A qualified worker should confirm the actual problem.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- 3. Reference views ---------- */}
      {photo && (
        <div className="rounded-2xl border border-border/70 bg-muted/25 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">Can’t capture the problem clearly?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate helpful AI reference views to show where the problem probably is.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl gap-2"
            onClick={runReferenceViews}
            disabled={generating}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {generating ? 'Creating reference views…' : 'Generate helpful AI reference views'}
          </Button>

          {views.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {views.map((view) => (
                <figure key={view.label} className="space-y-1">
                  <div className="relative overflow-hidden rounded-xl border border-border/70">
                    <img src={view.image} alt={`${view.label} — AI-generated reference`} className="w-full aspect-square object-cover" />
                    <span className="absolute bottom-1 left-1 right-1 rounded-md bg-background/85 px-1.5 py-0.5 text-[9px] font-semibold text-center">
                      AI-generated reference
                    </span>
                  </div>
                  <figcaption className="text-[11px] text-muted-foreground">{view.label}</figcaption>
                </figure>
              ))}
            </div>
          )}

          {views.length > 0 && (
            <p className="text-[11px] text-muted-foreground/90">
              These images are AI-generated illustrations, not real photographs of your property.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
