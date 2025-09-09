// frontend/src/routes/Result.jsx (この内容に完全に置き換える)

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTrainerAssets } from '../hooks/useTrainerAssets.js';
// ✅ このページだけで完結させるため、AudioContextは使いません
import { useAudioManager } from '../hooks/useAudioManager.js'; 

export default function Result() {
    const location = useLocation();
    const navigate = useNavigate();
    const { status, finalCount } = location.state || { status: 'finish', finalCount: 0 };

    const { trainerData, isLoading: trainerLoading } = useTrainerAssets();
    const { playAudio, isLoading: audioLoading } = useAudioManager();
    
    const [currentImage, setCurrentImage] = useState(null);
    const [message, setMessage] = useState('');
    // ✅ ユーザーが画面をタップしたかを管理する状態
    const [interacted, setInteracted] = useState(false);

    // 画像とメッセージだけは、データが読み込まれたらすぐに設定する
    useEffect(() => {
        if (!trainerLoading && trainerData) {
            let imageKey = '';
            if (status === 'finish') {
                imageKey = 'finish';
                setMessage(`お疲れ様でした！: ${finalCount}回`);
            } else if (status === 'retire') {
                imageKey = 'retire';
                setMessage('トレーニングを中断しました');
            }
            if (imageKey) {
                setCurrentImage(trainerData.countImages[imageKey]);
            }
        }
    }, [trainerLoading, trainerData, status, finalCount]);

    // ✅ 画面をタップした時の処理
    const handleInteraction = () => {
        if (interacted || audioLoading) return; // 既にタップ済みか、音声ロード中なら何もしない

        setInteracted(true); // タップ済みにする

        // 音声を再生する
        const soundToPlay = status === 'finish' ? 'finish' : 'retire';
        playAudio(soundToPlay);

        // 5秒後にホームページへ自動で遷移するタイマー
        const timer = setTimeout(() => {
            navigate('/');
        }, 5000);

        // クリーンアップ
        return () => clearTimeout(timer);
    };

    if (trainerLoading) {
        return <div style={styles.container}>結果を読み込み中...</div>;
    }

    return (
        // 画面全体をクリック（タップ）可能にする
        <div style={styles.container} onClick={handleInteraction}>

            {/* ✅ タップを促すメッセージ（まだタップされていない場合のみ表示） */}
            {!interacted && (
                <div style={styles.tapOverlay}>
                    <p>画面をタップして結果を見る</p>
                </div>
            )}

            {currentImage && <img src={currentImage} alt={status} style={styles.image} />}
            <h1 style={styles.title}>{status === 'finish' ? 'トレーニング終了！' : 'リタイア'}</h1>
            <h2 style={styles.message}>{message}</h2>
        </div>
    );
}

// スタイル（タップを促すメッセージ用のスタイルを追加）
const styles = {
    container: {
        display: 'flex',            // ✅ Flexboxを有効にする
        flexDirection: 'column',    // ✅ 子要素を縦に並べる
        // justifyContent: 'center',   // ✅ 縦方向の中央揃え
        alignItems: 'center',       // ✅ 横方向の中央揃え
        width: '100%',
        height: '100vh',            // 画面全体の高さを使う
        backgroundColor: '#111827',
        color: 'white',
        textAlign: 'center',
        padding: '20px'
    },
    image: {
        width: '200px',
        marginBottom: '24px',
        border: '5px solid #0ea5e9'
    },
    title: {
        fontSize: '32px',
        margin: '0 0 12px 0'
    },
    message: {
        fontSize: '20px',
        color: '#d1d5db',
        margin: 0
    },
    // ✅ 追加
    tapOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '24px',
        cursor: 'pointer',
        zIndex: 10
    }
};