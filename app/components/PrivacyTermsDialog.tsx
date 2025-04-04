'use client';

import { useState } from 'react';
import { X, FileText, Shield } from 'lucide-react';

export default function PrivacyTermsDialog({ 
  isOpen: externalIsOpen, 
  onClose 
}: { 
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');
  const [language, setLanguage] = useState<'en' | 'ja'>('en');
  
  // 外部から制御されるisOpenを使用
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  
  // 閉じる処理
  const handleClose = () => {
    if (externalIsOpen !== undefined) {
      // 外部制御モード
      if (onClose) onClose();
    } else {
      // 内部制御モード
      setInternalIsOpen(false);
    }
  };

  return (
    <>
      {/* ダイアログ */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" 
          onClick={handleClose}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-blue-100 dark:border-blue-900 w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()} // 内部クリックの伝播を防止
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b border-blue-50 dark:border-blue-900/30">
              <div className="flex gap-4">
                <button
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'privacy'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  onClick={() => setActiveTab('privacy')}
                >
                  <Shield size={16} />
                  {language === 'en' ? 'Privacy Policy' : 'プライバシーポリシー'}
                </button>
                <button
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'terms'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  onClick={() => setActiveTab('terms')}
                >
                  <FileText size={16} />
                  {language === 'en' ? 'Terms of Service' : '利用規約'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className={`p-2 rounded-full flex items-center justify-center ${language === 'en'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  onClick={() => setLanguage('en')}
                  title="English"
                >
                  <span className="text-xs font-medium">EN</span>
                </button>
                <button
                  className={`p-2 rounded-full flex items-center justify-center ${language === 'ja'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  onClick={() => setLanguage('ja')}
                  title="日本語"
                >
                  <span className="text-xs font-medium">JP</span>
                </button>

                <button
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:cursor-pointer"
                  onClick={handleClose}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="p-6 overflow-y-auto">
              {activeTab === 'privacy' ? (
                language === 'en' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Privacy Policy</h2>
                    <p className="italic text-slate-500 dark:text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">1. Information We Collect</h3>
                    <p>
                      We collect information to provide better services to our users. The information we collect includes:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong className="font-semibold">Usage Data:</strong> We collect anonymous usage data through Google Analytics to understand how users interact with our application.</li>
                      <li><strong className="font-semibold">Local Storage Data:</strong> Your mindmap data is stored locally on your device using IndexedDB and is not transmitted to our servers.</li>
                    </ul>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">2. How We Use Information</h3>
                    <p>
                      We use the information we collect to:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Improve and optimize our application</li>
                      <li>Analyze usage patterns to enhance user experience</li>
                      <li>Develop new features based on user behavior</li>
                    </ul>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">3. Data Storage</h3>
                    <p>
                      All mindmap data is stored locally on your device using IndexedDB. This data remains on your device and is not transmitted to our servers. This allows you to use the application offline and ensures your data remains private.
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">4. Analytics</h3>
                    <p>
                      We use Google Analytics to collect anonymous usage data. This helps us understand how users interact with our application and improve our services. Google Analytics may use cookies to collect information about your use of our application.
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">5. Changes to This Privacy Policy</h3>
                    <p>
                      We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">6. Contact Us</h3>
                    <p>
                      If you have any questions about this Privacy Policy, please contact us.
                    </p>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">プライバシーポリシー</h2>
                    <p className="italic text-slate-500 dark:text-slate-400">最終更新日: {new Date().toLocaleDateString()}</p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">1. 収集する情報</h3>
                    <p>
                      私たちはユーザーにより良いサービスを提供するために情報を収集しています。収集する情報には以下が含まれます：
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong className="font-semibold">利用データ：</strong> Google Analyticsを通じて匿名の利用データを収集し、ユーザーがアプリケーションとどのように相互作用するかを理解します。</li>
                      <li><strong className="font-semibold">ローカルストレージデータ：</strong> マインドマップデータはIndexedDBを使用してデバイス上にローカルに保存され、開発者のサーバーには送信されません。</li>
                    </ul>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">2. 情報の使用方法</h3>
                    <p>
                      収集した情報は以下の目的で使用します：
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>アプリケーションの改善と最適化</li>
                      <li>ユーザー体験を向上させるための利用パターンの分析</li>
                      <li>ユーザーの行動に基づく新機能の開発</li>
                    </ul>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">3. データの保存</h3>
                    <p>
                      すべてのマインドマップデータはIndexedDBを使用してデバイス上にローカルに保存されます。このデータはデバイス上に残り、開発者のサーバーには送信されません。これにより、オフラインでアプリケーションを使用でき、データのプライバシーが確保されます。
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">4. 分析</h3>
                    <p>
                      私たちはGoogle Analyticsを使用して匿名の利用データを収集しています。これにより、ユーザーがアプリケーションとどのように相互作用するかを理解し、サービスを改善することができます。Google Analyticsはアプリケーションの使用に関する情報を収集するためにCookieを使用する場合があります。
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">5. プライバシーポリシーの変更</h3>
                    <p>
                      私たちは随時プライバシーポリシーを更新することがあります。変更がある場合は、このページに新しいプライバシーポリシーを掲載することでお知らせします。
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">6. お問い合わせ</h3>
                    <p>
                      このプライバシーポリシーについてご質問がある場合は、お気軽にお問い合わせください。
                    </p>
                  </div>
                )
              ) : (
                language === 'en' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Terms of Service</h2>
                    <p className="italic text-slate-500 dark:text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">1. Acceptance of Terms</h3>
                    <p>
                      By accessing or using our mindmap application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our application.
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">2. Description of Service</h3>
                    <p>
                      Our mindmap application provides tools for creating and managing mindmaps. The application stores all data locally on your device and can function offline.
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">3. User Responsibilities</h3>
                    <p>
                      You are responsible for:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong className="font-semibold">Maintaining the confidentiality</strong> of your data</li>
                      <li><strong className="font-semibold">All activities</strong> that occur on your device</li>
                      <li>Ensuring that your use of the application does not violate any applicable laws or regulations</li>
                    </ul>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">4. Intellectual Property</h3>
                    <p>
                      The application, including all content, features, and functionality, is owned by us and is protected by international copyright, trademark, and other intellectual property laws.
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">5. Limitation of Liability</h3>
                    <p>
                      To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or use, arising out of or in connection with your use of the application.
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">6. Changes to Terms</h3>
                    <p>
                      We reserve the right to modify these Terms of Service at any time. We will provide notice of significant changes by posting the new Terms of Service on this page.
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">7. Governing Law</h3>
                    <p>
                      These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which we operate, without regard to its conflict of law provisions.
                    </p>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">利用規約</h2>
                    <p className="italic text-slate-500 dark:text-slate-400">最終更新日: {new Date().toLocaleDateString()}</p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">1. 規約の同意</h3>
                    <p>
                      このマインドマップアプリケーションにアクセスまたは使用することにより、あなたはこれらの利用規約に拘束されることに同意するものとします。これらの条件に同意しない場合は、アプリケーションを使用しないでください。
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">2. サービスの説明</h3>
                    <p>
                      このマインドマップアプリケーションは、マインドマップの作成と管理のためのツールを提供します。アプリケーションはすべてのデータをデバイス上にローカルに保存し、オフラインで機能することができます。
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">3. ユーザーの責任</h3>
                    <p>
                      あなたには以下の責任があります：
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong className="font-semibold">データの機密性</strong>を維持すること</li>
                      <li>デバイス上で発生する<strong className="font-semibold">すべての活動</strong></li>
                      <li>アプリケーションの使用が適用される法律や規制に違反しないようにすること</li>
                    </ul>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">4. 知的財産権</h3>
                    <p>
                      アプリケーション（すべてのコンテンツ、機能、および機能性を含む）は開発者が所有し、国際的な著作権、商標、およびその他の知的財産法によって保護されています。
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">5. 責任の制限</h3>
                    <p>
                      法律で許可される最大限の範囲で、開発者はアプリケーションの使用に起因または関連して生じる間接的、偶発的、特別、結果的、または懲罰的な損害（利益、データ、または使用の損失を含む）について責任を負いません。
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">6. 規約の変更</h3>
                    <p>
                      開発者はいつでもこれらの利用規約を変更する権利を留保します。重要な変更がある場合は、このページに新しい利用規約を掲載することでお知らせします。
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">7. 準拠法</h3>
                    <p>
                      これらの規約は、開発者が事業を行う管轄区域の法律に従って解釈され、その法律の抵触に関する規定にかかわらず、その法律に準拠するものとします。
                    </p>
                  </div>
                )
              )}
            </div>

            {/* フッター */}
            <div className="p-4 border-t border-blue-50 dark:border-blue-900/30 flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors hover:cursor-pointer"
              >
                {language === 'en' ? 'Close' : '閉じる'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 新しいコンポーネント: PrivacyTermsButton
export function PrivacyTermsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full shadow-lg border border-blue-100 dark:border-blue-900 hover:bg-white dark:hover:bg-slate-700 transition-colors hover:cursor-pointer"
      aria-label="Privacy & Terms"
    >
      <FileText size={20} className="text-blue-500 dark:text-blue-400" />
    </button>
  );
} 