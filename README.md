# イズミフィットネスセンター

スマホのインカメラで腹筋回数を自動カウントし、泉さんの音声で応援するシンプルなWebアプリ（MVP）。

- フロントエンド: React + Vite（JavaScript）/ プレーンCSS / React Router / PWA
- バックエンド: Express + PostgreSQL（Supabase）
- アセット: Cloudflare R2（S3互換・公開オブジェクト）
- デプロイ想定: フロント=Vercel、バック=Render、DB=Supabase、アセット=R2

## リポ構成

```
frontend/   # Vite+React（PWA対応）
backend/    # Express API（/trainer-assets）
```

## 開発環境セットアップ

前提:
- Node.js 18+ / npm
- Supabase（PostgreSQL）への接続情報（開発DB）

### 1) バックエンド

1. 依存関係インストール
```bash
cd backend
npm i
```

2. 環境変数を設定（`backend/.env`）
```env
DB_HOST=aws-1-ap-northeast-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.gbipagxklbfcnjzhahfm
DB_PASSWORD=[YOUR-PASSWORD]
DB_NAME=postgres
DB_POOL_LIMIT=10
CORS_ORIGINS=http://localhost:5173
PORT=3000
```

3. マイグレーション実行
```bash
npm run migrate
```

4. ダミーデータ投入
```bash
npm run seed
```

5. 起動
```bash
npm run start
```
- Health check: `GET http://localhost:3000/health`
- API: `GET http://localhost:3000/trainer-assets`

### 2) フロントエンド

1. 依存関係インストール
```bash
cd frontend
npm i
```

2. 開発サーバ起動
```bash
npm run dev
```
- ブラウザ: http://localhost:5173
- 開発時はViteのプロキシにより `/api` → `http://localhost:3000` へルーティングされます

## 実装済み機能

### ✅ 完了済み
- **カメラ起動・ミラー表示・オーバーレイ描画**: getUserMedia、ミラー表示、canvas オーバーレイ
- **MediaPipe Face Detection**: CDN配信、ヒステリシス判定（確信度0.8、サイズ閾値12%/6%、250ms/400ms）
- **音声管理**: プリロード（重要音声）、優先割込、キュー制御、遅延読み込み
- **カウントダウン**: 3-2-1カウントダウン、検出開始タイミング制御
- **HUD表示**: カウント数、顔枠（検出=黄、確定=緑）、状態表示
- **バックグラウンド処理**: 一時停止・復帰、Wake Lock（画面スリープ防止）
- **完了・リタイア処理**: 音声再生後の自動ホーム遷移
- **ダミーデータ**: プレースホルダー画像・音声、DB初期データ

### 🎯 合意済み仕様
- 目標回数: 10/20/30（初期10）
- カメラ: フロントカメラ（ミラー表示）、毎フレーム検出、縦向きのみ（MVP）
- 顔検出: MediaPipe Face Detection（CDN配信）
- 判定パラメータ（初期案）
  - 確信度 ≥ 0.8、サイズ閾値（短辺比）on=12%/off=6%、出現連続≥250ms、リセット連続≥400ms、5フレーム中央値
- 音声: .m4a、同時再生なし、優先割込（半分/残5/完了/リタイアはカウントを中断して再生）
- カウントダウン: 開始音声→0.5s→3→1s→2→1s→1→0.5s→検出開始
- トリガー: 半分= current==target/2、残5= remaining==5（10回時は半分のみ）
- 終了時: 完了/リタイア音声再生後に自動でホームへ戻る
- 受入基準: 誤カウント率 ≤ 5%、初回ロード ≤ 5秒

## PWA
- `public/manifest.webmanifest` と `public/sw.js` を用意済み（最小実装）
- アイコンは未設定。`public/icons/` 配下に 512x512 のPNGを追加し、manifestのiconsに追記してください

## データベース
- マイグレーション: `backend/migrations/001_create_trainer_assets.sql`
- スキーマ: `trainer_assets`
```
id BIGSERIAL PRIMARY KEY
trainer_name VARCHAR(255) NOT NULL
photo_url VARCHAR(1024) NOT NULL
audio_url VARCHAR(1024) NOT NULL
audio_type VARCHAR(20) CHECK (audio_type IN ('start','count','half','last5','complete','retire')) NOT NULL
count_number INTEGER NULL
INDEX (trainer_name, audio_type, count_number)
```
- 想定データ: `trainer_name='Izumi'` 固定で、開始/半分/残5/完了/リタイア と カウント1..30の複数行

## API（MVP契約）
- `GET /trainer-assets`
```json
{
  "trainerName": "Izumi",
  "photoUrl": "https://.../trainer/izumi/photo/photo.jpg",
  "audio": {
    "start": "https://.../audio/start.m4a",
    "half": "https://.../audio/half.m4a",
    "last5": "https://.../audio/last5.m4a",
    "complete": "https://.../audio/complete.m4a",
    "retire": "https://.../audio/retire.m4a",
    "count": { "1": ".../count/1.m4a", "2": ".../count/2.m4a" }
  }
}
```

## 今後のタスク（デプロイ・本番化）

### インフラ/配信
- R2: バケット`trainer-assets`、`trainer/izumi/...` への実際の泉さん資産配置、CORS(GET/HEAD)設定
- フロント: Vercelへデプロイ（環境変数 `VITE_API_BASE=https://api.example.com` 等が必要なら追加）
- バック: Renderへデプロイ（環境変数/ヘルスチェック）

### 本番データ
- 泉さんの実際の写真・音声ファイル（.m4a形式）
- 音声ファイルの最適化（ファイルサイズ・品質）
- アイコン画像（512x512 PNG）

### 最適化
- 音声ファイルのプリロード戦略の調整
- 顔検出パラメータの実機チューニング
- パフォーマンス監視・エラーハンドリング強化

## 実機検証のポイント
- HTTPS環境（Vercel/Render）でカメラ許可動作を確認
- iOS Safari / Android Chrome での音声連続再生・自動再生ポリシーの挙動確認
- 誤カウントが多い場合は、確信度・サイズ閾値・連続フレーム数を保守的に調整

## GitHub への新規プッシュ手順（参考）
新規レポジトリ（例: `izumi_fitness_center`）をGitHubで作成後、ローカルで以下を実行:
```bash
cd <このプロジェクトのルート>
git init -b main
git add .
git commit -m "feat: complete MVP implementation with camera, face detection, audio, and PWA"
git remote add origin https://github.com/ISDL-academic/izumi_fitness_center.git
git push -u origin main
```

必要に応じて `.gitignore` を追加してください（例: `node_modules/`, `.env`, `dist/` など）。

## 動作確認手順

1. **バックエンド起動**
   ```bash
   cd backend
   npm i
   npm run migrate
   npm run seed
   npm run start
   ```

2. **フロントエンド起動**
   ```bash
   cd frontend
   npm i
   npm run dev
   ```

3. **ブラウザで確認**
   - http://localhost:5173 にアクセス
   - 目標回数を選択して「開始」をクリック
   - カメラ許可を与える
   - 腹筋運動で顔検出・カウント動作を確認

## 注意事項
- 現在はダミーの音声ファイルを使用（実際の泉さんの音声に差し替え必要）
- プレースホルダー画像を使用（実際の泉さんの写真に差し替え必要）
- 本番環境ではHTTPS必須（カメラ許可のため）