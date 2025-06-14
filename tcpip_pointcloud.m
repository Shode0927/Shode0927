import java.net.ServerSocket
import java.io.*

try
    serverSocket = ServerSocket(55000);
    disp('Waiting for client connection...')
    drawnow('update')

    while true
        try
            % クライアントからの接続待ち
            socket = serverSocket.accept;
            disp('Client connected')
            drawnow('update')

            % 入力/出力ストリームを取得
            inputStream = BufferedReader(InputStreamReader(socket.getInputStream));
            outputStream = PrintWriter(socket.getOutputStream, true);
            i = 1;
            pause_flag = false; % Pauseボタンのトリガー

            while true
                % クライアントからのデータ受信
                message = inputStream.readLine;
                disp(['Received: ', char(message)])
                drawnow('update')
                messageStr = char(message);
                inputs = strsplit(messageStr, ',');

                % 入力項目
                F_str = inputs{1};
                total_time_str = inputs{2};
                m_str = inputs{3};
                r_str = inputs{4};
                mu_str = inputs{5};
                c_str = inputs{6};
                g_str = inputs{7};
                v_wind_str = inputs{8};
                A_str = inputs{9};
                rho_str = inputs{10};
                Cd_str = inputs{11};
                time_step_str = inputs{12}; % 計算ピッチ
                time_ratio_str = inputs{13}; % シミュレーション実行速度の倍率
        
                % 入力項目を数値変換
                F = str2double(F_str);
                total_time = str2double(total_time_str);
                m = str2double(m_str);
                r = str2double(r_str);
                mu = str2double(mu_str);
                c = str2double(c_str);
                g = str2double(g_str);
                v_wind = str2double(v_wind_str);
                A = str2double(A_str);
                rho = str2double(rho_str);
                Cd = str2double(Cd_str);
                time_step = str2double(time_step_str);
                time_ratio = str2double(time_ratio_str);

                % ローバ一座標値の取得 ※Y・Z座標はUnity側で送信する際に入れ替える.X軸は進行方向、Y軸は車体左側、Z軸は上方向
                message = inputStream.readLine;
                disp(['taskRover data :', char(message)])
                drawnow('update')
                messageStr = char(message);
                inputs = strsplit(messageStr, ',');

                taskRoverX = inputs{1};
                taskRoverY = inputs{2};
                taskRoverZ = inputs{3};
                roverRotX = inputs{4};
                roverRotY = inputs{5};
                roverRotZ = inputs{6};
                
                % タイヤの4輪化
                rightFrontTirePositionX = inputs{7};
                rightFrontTirePositionY = inputs{8};
                rightFrontTirePositionZ = inputs{9};
                leftFrontTirePositionX = inputs{10};
                leftFrontTirePositionY = inputs{11};
                leftFrontTirePositionZ = inputs{12};

                taskRoverX = str2double(taskRoverX);
                taskRoverY = str2double(taskRoverY);
                taskRoverZ = str2double(taskRoverZ);
                roverRotX = str2double(roverRotX);
                roverRotY = str2double(roverRotY);
                roverRotZ = str2double(roverRotZ);
                
                rightFrontTirePositionX = str2double(rightFrontTirePositionX);
                rightFrontTirePositionY = str2double(rightFrontTirePositionY);
                rightFrontTirePositionZ = str2double(rightFrontTirePositionZ);
                leftFrontTirePositionX = str2double(leftFrontTirePositionX);
                leftFrontTirePositionY = str2double(leftFrontTirePositionY);
                leftFrontTirePositionZ = str2double(leftFrontTirePositionZ);

                disp(['TaskRover Position-X Y Z:', num2str(taskRoverX), ',', num2str(taskRoverY), ',', num2str(taskRoverZ)])
                fprintf('TaskRover Rotation X: %f, Y: %f, Z: %f\n', roverRotX, roverRotY, roverRotZ);
                fprintf('Right Front Tire Position X: %f, Y: %f, Z: %f\n', rightFrontTirePositionX, rightFrontTirePositionY, rightFrontTirePositionZ);
                fprintf('Left Front Tire Position X: %f, Y: %f, Z: %f\n', leftFrontTirePositionX, leftFrontTirePositionY, leftFrontTirePositionZ);

                % シミュレーション間隔（time_ratioは倍率）
                simulationInterval = time_step / time_ratio;
                timeout = 10 * simulationInterval; % クライアントとの接続検出

                % 初回のシーン読み込みの猶予時間(s)
                sceneLoadTime = 8;

                filepath = 'pointcloud_all_area.txt';
                num_nearby_points = 60; % ローバの近傍点のサンプル数

                % output9~11はF_wind, F_roll, F_move（シミュレーションに使用しない）
                [output1, output2, output3, output4, output5, output6, output7, output8, output9, output10, output11, output12, output13] = noslip_function( ...
                    F, total_time, m, r, mu, c, g, v_wind, A, rho, Cd, time_step, filepath, taskRoverX, taskRoverY, taskRoverZ, num_nearby_points, roverRotY, ...
                    rightFrontTirePositionY,leftFrontTirePositionY);

                while true
                    % データが利用可能かどうかをチェック
                    if inputStream.ready
                        messageStr = inputStream.readLine; % コマンドの受信をチェック
                        if strcmp(messageStr, 'STOP')
                            disp('STOP command')
                            error('STOP')
                        elseif strcmp(messageStr, 'PAUSE')
                            disp('PAUSE command')
                            pause_flag = true; % フラグを真に設定してデータ送信を一時停止
                        elseif strcmp(messageStr, 'RESUME')
                            disp('RESUME command')
                            pause_flag = false; % フラグを偽に設定してデータ送信を再開
                        end
                    end

                    if ~pause_flag
                        output1_str = sprintf('%f', output1(i));
                        output2_str = sprintf('%f', output2(i));
                        output3_str = sprintf('%f', output3(i));
                        output4_str = sprintf('%f', output4(i));
                        output5_str = sprintf('%f', output5(i));
                        output6_str = sprintf('%f', output6(i));
                        output7_str = sprintf('%f', output7(i));
                        output8_str = sprintf('%f', output8(i));
                        output9_str = sprintf('%f', output9(i));
                        output13_str = sprintf('%f', output13(i));
                        
                        output = sprintf('%s,%s,%s,%s,%s,%s,%s,%s,%s,%s', output1_str, output2_str, output3_str, output4_str, output5_str, output6_str, output7_str, output8_str, output9_str, output13_str);
                        outputStream.println(output);
                        outputStream.flush();
                        % 初回のみ、Unityのシーン読み込みのため、待機する。
                        if i == 1
                            pause(sceneLoadTime);
                        end

                        % 送信するデータをログに出力
                        disp(['Sending data: ', output]);
                        fprintf('F_wind = %f, F_roll = %f, F_move = %f\n', output10(i), output11(i), output12(i));
                        disp(' ');

                        i = i + 1;

                    end

                    tic;
                    while ~inputStream.ready
                        % タイムアウトした場合
                        if toc > timeout
                            disp('Timeout')
                            error('Timeout : %d seconds', timeout);
                        end
                    end

                end
            end
        catch e
            % 接続切断やエラーが発生した場合、catchブロックにより、接続を閉じてから再度接続待ち状態に戻る
            if ~isempty(socket)
                socket.close
            end
            disp('Connection closed or error occurred. Waiting for client connection...')
            drawnow('update')
        end
    end

catch e
    if ~isempty(serverSocket)
        serverSocket.close
        disp('server close')
    end
    if ~isempty(socket)
        socket.close
        disp('client close')
    end
end
