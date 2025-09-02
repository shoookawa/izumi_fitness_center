# イズミフィットネスセンター

スマホのインカメラで腹筋回数を自動カウントし、泉さんの音声で応援するシンプルなWebアプリ（MVP）。

- フロントエンド: React + Vite（JavaScript）/ プレーンCSS / React Router / PWA
- バックエンド: Express + mysql2（PlanetScale MySQL互換）
- アセット: Cloudflare R2（S3互換・公開オブジェクト）
- デプロイ想定: フロント=Vercel、バック=Render、DB=PlanetScale、アセット=R2

## リポ構成

```
frontend/   # Vite+React（PWA対応）
backend/    # Express API（/trainer-assets）
```

## 開発環境セットアップ

前提:
- Node.js 18+ / npm
- PlanetScale（または互換MySQL）への接続情報（開発DB）

### 1) バックエンド

1. 依存関係インストール
```
cd backend
npm i
```
2. 環境変数を設定（`backend/.env`）
```
DB_HOST=xxxx
DB_PORT=3306
DB_USER=xxxx
DB_PASSWORD=xxxx
DB_NAME=izumi_fitness_center_dev
DB_POOL_LIMIT=10
CORS_ORIGINS=http://localhost:5173
PORT=3000
```
3. マイグレーション実行
```
npm run migrate
```
4. 起動
```
npm run start
```
- Health check: `GET http://localhost:3000/health`
- API: `GET http://localhost:3000/trainer-assets`

### 2) フロントエンド

1. 依存関係インストール
```
cd frontend
npm i
```
2. 開発サーバ起動
```
npm run dev
```
- ブラウザ: http://localhost:5173
- 開発時はViteのプロキシにより `/api` → `http://localhost:3000` へルーティングされます

## PWA
- `public/manifest.webmanifest` と `public/sw.js` を用意済み（最小実装）
- アイコンは未設定。`public/icons/` 配下に 512x512 のPNGを追加し、manifestのiconsに追記してください

## データベース
- マイグレーション: `backend/migrations/001_create_trainer_assets.sql`
- スキーマ: `trainer_assets`
```
id BIGINT PK AUTO_INCREMENT
trainer_name VARCHAR(255) NOT NULL
photo_url VARCHAR(1024) NOT NULL
audio_url VARCHAR(1024) NOT NULL
audio_type ENUM('start','count','half','last5','complete','retire') NOT NULL
count_number INT NULL
INDEX (trainer_name, audio_type, count_number)
```
- 想定データ: `trainer_name='Izumi'` 固定で、開始/半分/残5/完了/リタイア と カウント1..30の複数行

## API（MVP契約）
- `GET /trainer-assets`
```
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

## 合意済み仕様（抜粋）
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

## 今後やること（実装TODO）
- フロント
  - カメラ起動（getUserMedia）/ ミラー表示 / 画面スリープ防止（Wake Lock/NoSleep代替）
  - MediaPipe Face Detection 組み込みとヒステリシス判定
  - オーバーレイ描画（顔枠: 検出=黄/確定=緑）、HUD（カウント表示）
  - 音声管理（重要音声プリロード/遅延ロード、優先割込、キュー制御）
  - バックグラウンド一時停止/復帰
  - PWAアイコン追加、manifestのicons更新
- バックエンド
  - PlanetScale接続の検証と本番/開発環境変数の整理
  - `trainer_assets` の初期データ投入スクリプト（任意）
  - CORSの本番ドメイン反映
- インフラ/配信
  - R2: バケット`trainer-assets`、`trainer/izumi/...` へのダミー資産配置、CORS(GET/HEAD)設定
  - フロント: Vercelへデプロイ（環境変数 `VITE_API_BASE=https://api.example.com` 等が必要なら追加）
  - バック: Renderへデプロイ（環境変数/ヘルスチェック）

## 実機検証のポイント
- HTTPS環境（Vercel/Render）でカメラ許可動作を確認
- iOS Safari / Android Chrome での音声連続再生・自動再生ポリシーの挙動確認
- 誤カウントが多い場合は、確信度・サイズ閾値・連続フレーム数を保守的に調整

## GitHub への新規プッシュ手順（参考）
新規レポジトリ（例: `izumi_fitness_center`）をGitHubで作成後、ローカルで以下を実行:
```
cd <このプロジェクトのルート>
git init -b main
git add .
git commit -m "chore: scaffold frontend/backend and migrations"
git remote add origin https://github.com/shoookawa/izumi_fitness_center.git
git push -u origin main
```

必要に応じて `.gitignore` を追加してください（例: `node_modules/`, `.env`, `dist/` など）。 