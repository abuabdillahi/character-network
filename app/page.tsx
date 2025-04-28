'use client';

import { useState } from 'react';

export default function Home() {
  const [bookId, setBookId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [characterData, setCharacterData] = useState(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookId.trim()) {
      setError('Please enter a book ID');
      return;
    }

    setLoading(true);
    setError('');
    setCharacterData(null);

    try {
      // Step 1: Fetch the book text from the books API
      const bookResponse = await fetch(`/api/books/${bookId}`);

      if (!bookResponse.ok) {
        throw new Error(`Failed to fetch book: ${bookResponse.statusText}`);
      }

      const bookText = await bookResponse.text();

      // Step 2: Send the book text to the analysis API
      const analysisResponse = await fetch('/api/text', {
        method: 'POST',
        body: bookText,
      });

      if (!analysisResponse.ok) {
        throw new Error(`Failed to analyze text: ${analysisResponse.statusText}`);
      }

      const data = await analysisResponse.json();
      setCharacterData(data.interactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
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

      {loading && (
        <div className="p-4 mb-6 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          Loading... This may take a minute or two depending on the book size.
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
