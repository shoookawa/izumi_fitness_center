graph TD
    subgraph "準備フェーズ"
        A[/"ホーム画面<br>・泉さんの写真を表示<br>・ユーザーが回数を選択"/]
    end

    subgraph "トレーニングフェーズ"
        StartAudio("音声再生<br>「今日もはりきっていきましょう！」")
        B[/"トレーニング画面<br>・インカメラ起動<br>・泉さんの写真を表示<br>・カウント数を表示"/]
        CheckLoop((ループ開始))
        RetireCheck{リタイアボタン？}
        AbsCheck{腹筋を検知？}
        CountUp["処理: カウント+1<br>音声再生「(回数)！」"]
        SpecialCheck{応援タイミング？}
        CheerAudio("応援音声再生<br>「あと半分！」など")
        GoalCheck{目標回数に到達？}
    end

    subgraph "終了フェーズ"
        SuccessAudio("完了音声再生<br>「よく頑張りました」")
        RetireAudio("リタイア音声再生<br>「次は頑張りましょう」")
    end

    %% フローの定義
    A -- "開始ボタン" --> StartAudio
    StartAudio --> B
    B --> CheckLoop

    CheckLoop --> RetireCheck
    RetireCheck -- Yes --> RetireAudio
    RetireCheck -- No --> AbsCheck

    AbsCheck -- No --> CheckLoop
    AbsCheck -- Yes --> CountUp

    CountUp --> GoalCheck
    GoalCheck -- Yes --> SuccessAudio
    GoalCheck -- No --> SpecialCheck

    SpecialCheck -- Yes --> CheerAudio
    SpecialCheck -- No --> CheckLoop
    CheerAudio --> CheckLoop

    SuccessAudio --> A
    RetireAudio --> A