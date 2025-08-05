import { useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";

library.add(fas, far, fab);

// 真ん中省略（全角18 / 半角30）
function truncateMiddle(str, maxLength = 30) {
  if (!str) return "";
  const isJapanese = /\P{ASCII}/u.test(str);
  const limit = isJapanese ? 18 : maxLength;
  if (str.length <= limit) return str;
  const half = Math.floor((limit - 3) / 2);
  return str.slice(0, half) + "..." + str.slice(-half);
}

function App() {
  const [file, setFile] = useState(null);
  const [loudness, setLoudness] = useState(-15);
  const [peak, setPeak] = useState(-2.0);
  const [sampleRate, setSampleRate] = useState(48000);
  const [bitrate, setBitrate] = useState(192);
  const [channel, setChannel] = useState("stereo");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");

  const [results, setResults] = useState([]);

  // ローディング状態
  const [loading, setLoading] = useState(false);

  // ラウドネス処理送信
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("ファイルを選択してください");

    setLoading(true); // ローディング開始

    const formData = new FormData();
    formData.append("audio", file);

    const query = new URLSearchParams({
      loudness,
      peak,
      sampleRate,
      bitrate,
      channel,
    });

    try {
      const res = await fetch(`https://loudness-tool-backend.onrender.com/process?${query.toString()}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        // サーバーからエラーメッセージがあれば日本語に変換して表示
        throw new Error(errorData.message ? `FFmpegエラー: ${errorData.message}` : "ラウドネス処理中に不明なエラーが発生しました");
      }

      const data = await res.json();

      // 表示用ファイル名（prefix/suffix付与）
      const originalName = file.name.replace(/\.[^/.]+$/, "");
      const finalName = `${prefix ? prefix + "_" : ""}${originalName}${suffix ? "_" + suffix : ""}.mp3`;

      // 結果追加
      setResults((prev) => [
        ...prev,
        {
          ...data.info,
          fileName: finalName, // 表示用に整形した名前
          fileBase64: data.file, // ダウンロード用
        },
      ]);

      // alert("ラウドネス処理が完了しました！");
    } catch (err) {
      if (err.message.includes("Failed to fetch")) {
        alert("サーバーに接続できません。サーバーが起動しているか確認してください。");
      } else {
        alert(`エラーが発生しました: ${err.message}`);
      }
      console.error(err);
    } finally {
      setLoading(false); // 処理終了
    }
  };

  // 音源ダウンロード
  const handleDownload = (base64Data, fileName) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // 1秒後に解放
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-6 lg:py-16">
      <div className="lg_container">
        <h1 className="leading-none text-2xl font-bold text-center text-[#9375FF] lg:text-4xl">
          <FontAwesomeIcon icon="fa-solid fa-compact-disc" />
          ラウドネス処理ツール
        </h1>
        <p className="mt-5 mb-6 lg:mt-7 lg:mb-8">
          <strong>注意事項：</strong><br></br>
          こちらのツールは簡易的なラウドネス処理ツールです。<br></br>
          1分未満の音声クリエイティブであればすぐに処理できますが、Podcast音源など数十分単位の長尺音源の場合は、<br className="hidden lg:block"></br>
          処理に時間がかかりタイムアウトする可能性があります。（目安：30分の音源で処理時間 約3分半）<br></br>
          書き出しフォーマットは、現時点ではMP3のみです。
        </p>
      </div>

      {/* 入力フォーム */}
      <form className="lg_container bg-white p-6 rounded shadow-md space-y-6" onSubmit={handleSubmit}>
        <h2 className="text-lg font-bold mb-4">
          <FontAwesomeIcon icon="fa-solid fa-gears" className="mr-1" />
          ラウドネス設定
        </h2>

        {/* ファイル選択 */}
        <div>
          <label className="block mb-1">▼音声ファイル</label>
          <label htmlFor="file-upload" className={`btn-normal px-4 py-2 inline-block ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
            ファイルを選択
          </label>
          {file && <p className="text-sm text-gray-600 mt-1">選択中：{truncateMiddle(file.name, 30)}</p>}
          <input id="file-upload" type="file" accept="audio/*" className="hidden" onChange={(e) => setFile(e.target.files[0])} disabled={loading} />
        </div>

        {/* ラウドネス・ピーク */}
        <div className="flex flex-col space-y-6 md:flex-row md:gap-4 md:space-y-0">
          <div className="md:w-1/2">
            <label className="block mb-1">▼ラウドネス（LUFS）</label>
            <input type="number" className="form-box" value={loudness} onChange={(e) => setLoudness(e.target.value)} />
          </div>

          <div className="md:w-1/2">
            <label className="block mb-1">▼トゥルーピーク（dBTP）</label>
            <input type="number" className="form-box" value={peak} onChange={(e) => setPeak(e.target.value)} />
          </div>
        </div>

        {/* サンプリング・ビットレート・チャンネル */}
        <div className="flex flex-col space-y-6 md:flex-row md:gap-4 md:space-y-0">
          <div className="md:w-1/3">
            <label className="block mb-1">▼サンプリング周波数</label>
            <select className="form-box cursor-pointer" value={sampleRate} onChange={(e) => setSampleRate(e.target.value)}>
              {[8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000].map((rate) => (
                <option key={rate} value={rate}>
                  {rate}Hz
                </option>
              ))}
            </select>
          </div>

          <div className="md:w-1/3">
            <label className="block mb-1">▼ビットレート</label>
            <select className="form-box cursor-pointer" value={bitrate} onChange={(e) => setBitrate(e.target.value)}>
              {[64, 96, 128, 160, 192, 256, 320].map((br) => (
                <option key={br} value={br}>
                  {br}kbps
                </option>
              ))}
            </select>
          </div>

          <div className="md:w-1/3">
            <label className="block mb-1">▼出力チャンネル</label>
            <select className="form-box cursor-pointer" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option key="stereo" value="stereo">
                ステレオ
              </option>
              <option key="mono" value="mono">
                モノラル
              </option>
            </select>
          </div>
        </div>

        {/* 接頭辞・接尾辞 */}
        <div className="flex flex-col space-y-6 md:flex-row md:gap-4 md:space-y-0">
          <div className="md:w-1/2">
            <label className="block mb-1">▼接頭辞（prefix）</label>
            <input type="text" className="form-box" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>

          <div className="md:w-1/2">
            <label className="block mb-1">▼末尾辞（suffix）</label>
            <input type="text" className="form-box" value={suffix} onChange={(e) => setSuffix(e.target.value)} />
          </div>
        </div>

        <div>
          <button type="submit" className={`block mx-auto btn-colored px-4 py-2 ${loading ? "opacity-50 cursor-not-allowed" : ""}`} disabled={loading}>
            {loading ? (
              <span className="flex items-center space-x-2">
                <FontAwesomeIcon icon="fa-solid fa-spinner" className="animate-spin" />
                <span>処理中...</span>
              </span>
            ) : (
              "ラウドネス処理を実行"
            )}
          </button>
        </div>
      </form>

      {/* 結果テーブル */}
      {results.length > 0 && (
        <div className="lg_container bg-white p-6 rounded shadow-md mt-10">
          <h2 className="text-lg font-bold mb-4">
            <FontAwesomeIcon icon="fa-solid fa-print" className="mr-1" />
            ラウドネス処理結果
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[928px] text-left border-2 border-gray-400 text-sm">
              <thead>
                <tr className="border-b-2 border-gray-400 text-center">
                  <th className="table-box w-[240px]">ファイル名</th>
                  <th className="table-box">ラウドネス</th>
                  <th className="table-box">トゥルーピーク</th>
                  <th className="table-box">サンプリング周波数</th>
                  <th className="table-box">ビットレート</th>
                  <th className="table-box">チャンネル</th>
                  <th className="table-box w-[130px]">ダウンロード</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, idx) => (
                  <tr key={idx} className="text-center">
                    <td className="table-box w-[240px]">{truncateMiddle(item.fileName, 30)}</td>
                    <td className="table-box">{item.loudness}</td>
                    <td className="table-box">{item.truePeak}</td>
                    <td className="table-box">{item.sampleRate}</td>
                    <td className="table-box">{item.bitrate}</td>
                    <td className="table-box">{item.channel}</td>
                    <td className="table-box w-[130px]">
                      <button
                        className={`btn-colored px-3 py-1 ${loading || !item.fileBase64 ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={loading || !item.fileBase64}
                        onClick={() => handleDownload(item.fileBase64, item.fileName)}
                      >
                        ダウンロード
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;