import { useState } from 'react'
import { translations } from './utils/translations'

function App() {
  const [language, setLanguage] = useState('ar')
  const t = translations[language]

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900" dir={language === 'ar' || language === 'ku' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">
            {t.appTitle}
          </h1>

          {/* Language Selector */}
          <div className="flex items-center gap-2" dir="ltr">
            {[['ar', 'العربية'], ['en', 'English'], ['ku', 'کوردی']].map(([code, name]) => (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  language === code
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              ✅ {language === 'ar' ? 'نظام CRM جاهز!' : language === 'en' ? 'CRM System Ready!' : 'سیستەمی CRM ئامادەیە!'}
            </h2>

            <div className="space-y-4 text-left max-w-2xl mx-auto">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                <h3 className="font-bold text-green-800 dark:text-green-300 mb-2">
                  {language === 'ar' ? '✅ البنية الأساسية جاهزة' : language === 'en' ? '✅ Base Structure Ready' : '✅ بنیادی پێکهاتە ئامادەیە'}
                </h3>
                <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                  <li>• Vite + React ✅</li>
                  <li>• Tailwind CSS ✅</li>
                  <li>• {language === 'ar' ? 'الترجمات (3 لغات)' : language === 'en' ? 'Translations (3 languages)' : 'وەرگێڕانەکان (3 زمان)'} ✅</li>
                  <li>• {language === 'ar' ? 'هيكل المجلدات' : language === 'en' ? 'Folder Structure' : 'پێکهاتەی فۆڵدەرەکان'} ✅</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">
                  {language === 'ar' ? '📋 الخطوات التالية' : language === 'en' ? '📋 Next Steps' : '📋 هەنگاوەکانی داهاتوو'}
                </h3>
                <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>1. {language === 'ar' ? 'راجع ملف NEXT_STEPS.md' : language === 'en' ? 'Review NEXT_STEPS.md file' : 'پێداچوونەوەی فایلی NEXT_STEPS.md'}</li>
                  <li>2. {language === 'ar' ? 'انسخ الكود من الملف الأصلي' : language === 'en' ? 'Copy code from original file' : 'کۆپی کردنی کۆد لە فایلی ڕەسەن'}</li>
                  <li>3. {language === 'ar' ? 'طبّق التحسينات الأمنية' : language === 'en' ? 'Apply security improvements' : 'جێبەجێکردنی باشکردنەکانی پاراستن'}</li>
                </ol>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
                <h3 className="font-bold text-yellow-800 dark:text-yellow-300 mb-2">
                  {language === 'ar' ? '📚 التوثيق' : language === 'en' ? '📚 Documentation' : '📚 بەڵگەنامە'}
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  {language === 'ar'
                    ? '6 ملفات توثيقية شاملة في المجلد الرئيسي'
                    : language === 'en'
                    ? '6 comprehensive documentation files in root folder'
                    : '6 بەڵگەنامەی گشتگیر لە فۆڵدەری سەرەکی'}
                </p>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {language === 'ar'
                  ? 'المشروع جاهز للتطوير! 🚀'
                  : language === 'en'
                  ? 'Project ready for development! 🚀'
                  : 'پڕۆژەکە ئامادەیە بۆ گەشەپێدان! 🚀'}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
        AI964 • CRM System v2.0 • Powered by Vite + React + Tailwind
      </footer>
    </div>
  )
}

export default App
