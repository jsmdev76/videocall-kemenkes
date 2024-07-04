import { Link } from '@remix-run/react';

export default function RoomNotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="max-w-md px-8 py-6 bg-white shadow-lg rounded-lg">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Room Not Found</h1>
        <p className="text-gray-700 mb-6">
          The room you are trying to access does not exist or you does not have access.
        </p>
      </div>
    </div>
  );
}
