import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8 text-center">
        <h1 className="text-4xl font-bold text-indigo-800 mb-6">
          Quiz App Live
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <div className="bg-indigo-50 rounded-xl p-6">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎮</span>
            </div>
            <h2 className="text-xl font-semibold mb-3">Participer à un quiz</h2>
            <p className="text-gray-600 mb-6">
              Rejoignez un quiz en cours avec le code d'accès ou scannez un QR
              code.
            </p>
            <Link href="/participant">
              <button className="w-full bg-indigo-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-indigo-700 transition">
                Rejoindre un quiz
              </button>
            </Link>
          </div>

          <div className="bg-purple-50 rounded-xl p-6">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👨‍💼</span>
            </div>
            <h2 className="text-xl font-semibold mb-3">
              Administrer des quiz
            </h2>
            <p className="text-gray-600 mb-6">
              Créez et gérez vos propres quiz interactifs.
            </p>
            <Link href="/dashboard">
              <button className="w-full bg-purple-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-purple-700 transition">
                Panneau d'administration
              </button>
            </Link>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-gray-500 text-sm">
            © 2023 Quiz App Live - Application de quiz interactifs en temps réel
          </p>
        </div>
      </div>
    </div>
  );
}
