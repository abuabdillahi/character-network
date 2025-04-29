'use client';

import { useState } from 'react';
import NetworkGraph, { Link, Node } from '@/components/network-graph';

// Function to transform character interaction data into network graph format
function transformCharacterData(data: Record<string, Record<string, { interactions: number }>>) {
  if (!data) return { nodes: [], links: [] };

  const nodes: { id: string; name: string; value: number }[] = [];
  const links: { source: string; target: string; value: number }[] = [];
  const nodeMap = new Map<string, number>();

  // First pass: collect all unique characters and their total interactions
  Object.entries(data).forEach(([character, interactions]) => {
    let totalInteractions = 0;
    Object.values(interactions).forEach(({ interactions: count }) => {
      totalInteractions += count;
    });
    nodeMap.set(character, totalInteractions);
  });

  // Create nodes with values based on total interactions
  nodeMap.forEach((value, name) => {
    nodes.push({
      id: name,
      name,
      value
    });
  });

  // Create links between characters
  Object.entries(data).forEach(([source, interactions]) => {
    Object.entries(interactions).forEach(([target, { interactions: value }]) => {
      links.push({
        source,
        target,
        value
      });
    });
  });

  return { nodes, links };
}

export default function Home() {
  const [bookId, setBookId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [characterData, setCharacterData] = useState(null);
  const [graphData, setGraphData] = useState<{ nodes: Node[], links: Link[] }>({ nodes: [], links: [] });
  const [progress, setProgress] = useState<{ step: string; percentage: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookId.trim()) {
      setError('Please enter a book ID');
      return;
    }

    setLoading(true);
    setError('');
    setCharacterData(null);
    setProgress({ step: 'Fetching book text...', percentage: 0 });

    try {
      // Step 1: Fetch the book text from the books API
      setProgress({ step: 'Fetching book text...', percentage: 20 });
      const bookResponse = await fetch(`/api/books/${bookId}`);

      if (!bookResponse.ok) {
        throw new Error(`Failed to fetch book: ${bookResponse.statusText}`);
      }

      const bookText = await bookResponse.text();
      setProgress({ step: 'Analyzing text...', percentage: 40 });

      // Step 2: Send the book text to the analysis API
      const analysisResponse = await fetch('/api/text', {
        method: 'POST',
        body: bookText,
      });

      if (!analysisResponse.ok) {
        throw new Error(`Failed to analyze text: ${analysisResponse.statusText}`);
      }

      setProgress({ step: 'Processing results...', percentage: 80 });
      const data = await analysisResponse.json();
      setCharacterData(data.interactions);
      setGraphData(transformCharacterData(data.interactions));
      setProgress({ step: 'Complete!', percentage: 100 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
      // Clear progress after a short delay
      setTimeout(() => setProgress(null), 2000);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Character Network Analyzer</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col gap-2 mb-4">
          <label htmlFor="bookId" className="font-medium">
            Project Gutenberg Book ID:
          </label>
          <input
            id="bookId"
            type="text"
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
            placeholder="Enter a book ID (e.g. 1342 for Pride and Prejudice)"
            className="border border-gray-300 rounded px-4 py-2"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white font-medium py-2 px-4 rounded disabled:bg-blue-400"
        >
          {loading ? 'Analyzing...' : 'Analyze Book'}
        </button>
      </form>

      {error && (
        <div className="p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {progress && (
        <div className="p-4 mb-6 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <div className="flex justify-between mb-2">
            <span>{progress.step}</span>
            <span>{progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {characterData && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Character Network Graph</h2>
          <div className="bg-white p-4 rounded-lg shadow">
            <NetworkGraph
              nodes={graphData.nodes}
              links={graphData.links}
              width={832}
              height={600}
              linkStrength={0.1}
              nodeCharge={-150}
              showLabels={true}
              enableZoom={true}
              enableDrag={true}
              onNodeClick={(node) => console.log('Clicked node:', node)}
            />
          </div>
        </div>
      )}

      {characterData && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Character Interactions</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px] text-black">
            {JSON.stringify(characterData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
