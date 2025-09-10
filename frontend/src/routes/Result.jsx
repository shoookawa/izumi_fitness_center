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
    const [audioPlayed, setAudioPlayed] = useState(false);

    // 画像とメッセージを設定
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

    // 音声を再生（一度だけ）
    useEffect(() => {
        if (!trainerLoading && trainerData && !audioPlayed && !audioLoading) {
            const soundToPlay = status === 'finish' ? 'finish' : 'retire';
            playAudio(soundToPlay);
            setAudioPlayed(true);
        }
    }, [trainerLoading, trainerData, audioPlayed, audioLoading, status, playAudio]);

    const handleHomeClick = () => {
        navigate('/');
    };

    if (trainerLoading) {
        return <div className="result-loading">結果を読み込み中...</div>;
    }

    return (
        <div className="result">
            <div className="trainer-photo">
                {currentImage && <img src={currentImage} alt={status} />}
            </div>
            <div className={`result-title ${status}`}>
                {status === 'finish' ? 'トレーニング終了！' : 'リタイア'}
            </div>
            <div className="result-message">{message}</div>
            <button className="home-button" onClick={handleHomeClick}>
                ホームに戻る
            </button>
        </div>
    );
}
