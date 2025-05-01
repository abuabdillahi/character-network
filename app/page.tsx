'use client';

import { useState, useRef, useEffect } from 'react';
import NetworkGraph, { Link, Node } from '@/components/network-graph';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CharacterDialog } from '@/components/character-dialog';
import { BookIdInput } from '@/components/book-id-input';
import { transformCharacterData } from '@/app/utils';

export default function Home() {
  const [bookId, setBookId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [characterData, setCharacterData] = useState(null);
  const [graphData, setGraphData] = useState<{ nodes: Node[], links: Link[] }>({ nodes: [], links: [] });
  const [progress, setProgress] = useState<{ step: string; percentage: number } | null>(null);
  const defaultGraphTitle = 'Character Network';
  const [graphTitle, setGraphTitle] = useState(defaultGraphTitle);
  const graphSectionRef = useRef<HTMLDivElement>(null);

  // Dialog state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    // Auto-scroll to graph section when loading
    if (loading && graphSectionRef.current) {
      graphSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, characterData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookId.trim()) {
      setError('Please enter a book ID');
      return;
    }

    setLoading(true);
    setError('');
    setCharacterData(null);
    setProgress({ step: 'Getting book text...', percentage: 0 });

    try {
      // Step 1: Fetch the book text from the books API
      setProgress({ step: 'Getting book text...', percentage: 20 });
      const bookResponse = await fetch(`/api/books/${bookId}`);

      if (!bookResponse.ok) {
        throw new Error("Couldn't get that book, please try again");
      }

      const bookText = await bookResponse.text();

      const bookMetadataResponse = await fetch(`/api/books/${bookId}/title`);
      const bookMetadata = await bookMetadataResponse.json()
      bookMetadata.title ? setGraphTitle(bookMetadata.title) : setGraphTitle(defaultGraphTitle);

      setProgress({ step: 'Analyzing text...', percentage: 40 });

      // Step 2: Send the book text to the analysis API
      const analysisResponse = await fetch('/api/analysis', {
        method: 'POST',
        body: JSON.stringify({ bookId, bookText }),
      });

      if (!analysisResponse.ok) {
        throw new Error("Analysis failed, please try again");
      }

      setProgress({ step: 'Processing results...', percentage: 80 });
      const data = await analysisResponse.json();
      setCharacterData(data.interactions);
      setGraphData(transformCharacterData(data.interactions));
      setProgress({ step: 'Complete!', percentage: 100 });
    } catch (err) {
      setError('Something went wrong, please try again');
    } finally {
      setLoading(false);
      // Clear progress after a short delay
      setTimeout(() => setProgress(null), 2000);
    }
  };

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col justify-center">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-slate-900">
            CharGraph
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
            Visualise the relationships between your favourite characters
          </p>
          <div className="flex flex-col items-center justify-center space-y-4 w-full max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="w-full">
              <div className="relative">
                <div className="flex">
                  <BookIdInput
                    bookId={bookId}
                    setBookId={setBookId}
                    disabled={loading}
                    loading={loading}
                  />
                </div>
              </div>
            </form>

            {error && (
              <div className="w-full p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
                <p className="font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div ref={graphSectionRef} className="container mx-auto px-4 pb-16 mt-24">
        {loading && !characterData && (
          <Card className="shadow-xl mb-8">
            <CardHeader>
              <CardTitle>{graphTitle}</CardTitle>
              <CardDescription>
                Analyzing book and generating visualization...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-[60vh] md:h-[600px]">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                  {progress?.step || 'Analyzing...'}
                </p>
                {progress && (
                  <div className="w-64 mt-4">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-2">
                      <div
                        className="bg-sky-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {characterData && (
          <>
            <Card className="shadow-xl mb-8">
              <CardHeader>
                <CardTitle>{graphTitle}</CardTitle>
                <CardDescription>
                  Interactive visualization of character relationships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white dark:bg-slate-900 rounded-lg h-[60vh] md:h-[600px]">
                  <NetworkGraph
                    nodes={graphData.nodes}
                    links={graphData.links}
                    nodeColor="#1e293b"
                    linkColor="#64748b"
                    height={'100%'}
                    linkStrength={0.1}
                    nodeCharge={-150}
                    showLabels={true}
                    enableZoom={false}
                    enableDrag={true}
                    onNodeClick={handleNodeClick}
                  />
                </div>
                <CardDescription>
                  Note: This analysis is based on the first 50,000 characters of the book
                </CardDescription>
              </CardContent>
            </Card>

            <CharacterDialog
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              selectedNode={selectedNode}
              characterData={characterData}
            />
          </>
        )}
      </div>
    </div>
  );
}
