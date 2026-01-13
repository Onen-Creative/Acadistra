import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { schoolsApi } from '@/services/api';

interface BookFormProps {
  book?: any;
  subjects: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const BookForm: React.FC<BookFormProps> = ({ book, subjects, onSubmit, onCancel }) => {
  const { data: schoolLevels } = useQuery({
    queryKey: ['school-levels'],
    queryFn: () => schoolsApi.getLevels(),
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      title: formData.get('title'),
      author: formData.get('author'),
      isbn: formData.get('isbn'),
      publisher: formData.get('publisher'),
      subject: formData.get('subject'),
      class: formData.get('class'),
      published_year: parseInt(formData.get('published_year') as string) || 0,
      total_copies: parseInt(formData.get('total_copies') as string) || 1,
      location: formData.get('location'),
      description: formData.get('description'),
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input 
            name="title" 
            defaultValue={book?.title} 
            required 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Author *</label>
          <input 
            name="author" 
            defaultValue={book?.author} 
            required 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">ISBN</label>
          <input 
            name="isbn" 
            defaultValue={book?.isbn} 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Subject *</label>
          <select 
            name="subject" 
            defaultValue={book?.subject} 
            required 
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Select subject</option>
            {subjects.map((subject: any, idx: number) => (
              <option key={idx} value={subject.name}>{subject.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Class</label>
          <select 
            name="class" 
            defaultValue={book?.class} 
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Select class (optional)</option>
            {(schoolLevels?.levels || []).map((level: string) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Publisher</label>
          <input 
            name="publisher" 
            defaultValue={book?.publisher} 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Published Year</label>
          <input 
            name="published_year" 
            type="number" 
            defaultValue={book?.published_year} 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Total Copies *</label>
          <input 
            name="total_copies" 
            type="number" 
            defaultValue={book?.total_copies || 1} 
            min="1" 
            required 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <input 
            name="location" 
            defaultValue={book?.location} 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea 
          name="description" 
          defaultValue={book?.description} 
          rows={3}
          className="w-full border rounded-lg px-3 py-2" 
        />
      </div>
      <div className="flex gap-3 pt-4">
        <button 
          type="submit" 
          className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
        >
          {book ? 'Update' : 'Add'} Book
        </button>
        <button 
          type="button" 
          onClick={onCancel} 
          className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default BookForm;
