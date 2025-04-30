import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from './ui/button';

// Popular books data with Gutenberg IDs
const popularBooks = [
    { id: '1342', title: 'Pride and Prejudice' },
    { id: '84', title: 'Frankenstein' },
    { id: '11', title: 'Alice in Wonderland' },
    { id: '2701', title: 'Moby Dick' },
    { id: '1661', title: 'The Adventures of Sherlock Holmes' },
    { id: '98', title: 'A Tale of Two Cities' },
    { id: '1400', title: 'Great Expectations' },
    { id: '345', title: 'Dracula' },
    { id: '174', title: 'The Picture of Dorian Gray' },
    { id: '16', title: 'Peter Pan' },
];

interface BookIdInputProps {
    bookId: string;
    setBookId: (id: string) => void;
    disabled?: boolean;
    loading?: boolean;
}

export function BookIdInput({ bookId, setBookId, disabled = false, loading = false }: BookIdInputProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Handle clicking outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Element;
            const dropdownElement = document.getElementById('books-dropdown');

            // Only close if click is outside both the input AND the dropdown
            if (inputRef.current &&
                !inputRef.current.contains(target) &&
                (!dropdownElement || !dropdownElement.contains(target))) {
                setShowDropdown(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBookSelect = (id: string) => {
        setBookId(id);
        setShowDropdown(false);
    };

    return (
        <>
            <div className="relative flex-grow">
                <Input
                    ref={inputRef}
                    id="bookId"
                    type="text"
                    value={bookId}
                    onChange={(e) => setBookId(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    onClick={() => setShowDropdown(true)}
                    placeholder="Enter Gutenberg ID (e.g. 1342)"
                    disabled={disabled}
                    className="w-full pr-3 rounded-r-none text-lg h-16"
                    autoComplete="off"
                />
                {showDropdown && (
                    <div id="books-dropdown" className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg">
                        <div className="p-2 text-sm font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            Popular books
                        </div>
                        <div className="max-h-60 overflow-auto py-1">
                            {popularBooks.map((book) => (
                                <div
                                    key={book.id}
                                    className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                    onClick={() => handleBookSelect(book.id)}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">{book.title}</span>
                                        <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400">
                                            {book.id}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <Button
                type="submit"
                disabled={loading}
                className="rounded-l-none border-l-0 text-lg px-8 h-16"
            >
                {loading ? 'Analyzing...' : 'Analyze'}
            </Button>
        </>
    );
} 