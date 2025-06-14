function [v, x, t, v_translation, angle_v, F_total, z, pitch_angle, y, F_wind_matrix, F_roll_matrix, F_move_matrix, roll_angle] = noslip_function(F, total_time, m, r, ...
    mu, c, g, v_wind, A, rho, Cd, time_step, pointcloud_file_path, roverX, roverY, roverZ, num_nearby_points, roverRotY, rightFrontTirePositionY, leftFrontTirePositionY)

    % mu：静止摩擦係数 c：転がり抵抗係数
    % rho：大気密度 Cd：空気抵抗係数
    % 左前輪：Vector3(0.09,-0.065,0.5)　右前輪：Vector3(0.085,-0.067,-0.1)
    % 左後輪；Vector3(-0.52,-0.03,0.5)　右後輪：Vector3(-0.52,-0.025,-0.1), ローカル関係要確認
    % tire_front_left = [0.09,-0.065,0.5];
    % tire_front_right = [0.09,-0.067,-0.1];
    % tire_back_left = [-0.52,-0.03,0.5];
    % tire_back_right = [-0.52,-0.025,-0.1];
    % rightFrontTirePositionY ：右前輪のローカルZ座標

    airSignal_x = 56.45;
    airSignal_y = 69.24;
    airSignal_z = 10.924;

    % オフセット済み.txtファイルから点群データを読み込む
    [x_luna, y_luna, z_luna] = read_pointcloud(pointcloud_file_path);
    % ローバの初期位置を設定　車両位置をLandXML系座標に調整
    initial_x = roverX - airSignal_x;
    initial_y = roverY - airSignal_y;
    initial_z = roverZ - airSignal_z;
    disp('TaskRover Position on LunaTerrace')
    fprintf('X = %f, Y= %f, Z= %f\n', initial_x, initial_y, initial_z);

    % ローバの初期位置Y軸に関して点を抽出
    % ※ ローバを中心に点群を回転させるため、一旦対空標識からローバまでの距離を引く
    x_luna_roveroffset = x_luna - initial_x;
    y_luna_roveroffset = y_luna - initial_y;
    
    % ルナテラスを逆回転させた点群情報を一時的に用いて、ローバが通る軌道上の点群（元のルナテラス点群）を取得
    % ローバを中心（原点）として点群マップを回転処理後、引いた分の距離(initial_y)を加算して補填
    roverRot_radian = -roverRotY * pi / 180;
    rotation_matrix = [cos(roverRot_radian), -sin(roverRot_radian); sin(roverRot_radian), cos(roverRot_radian)];
    rotated_coords = [x_luna_roveroffset, y_luna_roveroffset] * rotation_matrix;
    y_rotation = rotated_coords(:, 2) + initial_y;

    % 軌道上の点群（車両中心±0.2以下の座標値の点群）を取得
    nearby_index = find(abs(y_rotation - initial_y) <= 0.2);
    orbit_x = x_luna(nearby_index);
    orbit_y = y_luna(nearby_index);
    orbit_z = z_luna(nearby_index);

    % 車体中心から±0.3のY軸上点群を、各タイヤの軌道上点群として取得（タイヤの幅が0.1程度）
    vehicle_width = leftFrontTirePositionY - rightFrontTirePositionY; % 車両中心と車輪中心間の距離
    half_vehicle_width = vehicle_width / 2;
    tire_width = 0.1;
    index_tire_fl = abs(y_rotation - (initial_y + half_vehicle_width)) <= tire_width;
    index_tire_fr = abs(y_rotation - (initial_y - half_vehicle_width)) <= tire_width;
    index_tire_bl = find(abs(y_rotation - (initial_y + half_vehicle_width)) <= tire_width);
    index_tire_br = find(abs(y_rotation - (initial_y - half_vehicle_width)) <= tire_width);

    x_tireL = x_luna(index_tire_fl);
    y_tireL = y_luna(index_tire_fl);
    z_tireL = z_luna(index_tire_fl);
    x_tireR = x_luna(index_tire_fr);
    y_tireR = y_luna(index_tire_fr);
    z_tireR = z_luna(index_tire_fr);

    % 初期条件
    v0 = 0; % 初期速度 [m/s]
    t = 0:time_step:total_time; % シミュレーション時間 [s]
    x0 = 0; % 初期位置[m]
    y0 = 0;
    
    v = zeros(size(t));
    v(1) = v0;

    % 並進速度
    v_translation = zeros(size(t));
    v_translation(1) = 0;
    % 変位（出力値）
    x = zeros(size(t));
    x(1) = x0;
    y = zeros(size(t));
    y(1) = y0;
    
    angle_v = zeros(size(t)); % タイヤの回転速度
    F_total = zeros(size(t)); % 車体にかかる作用力
    F_friction = mu * m * g; % タイヤの摩擦による抗力
    F_wind = 0.5 * Cd * A * rho * abs(v(1)-v_wind) * (v(1)-v_wind); % 空気抵抗
    F_stop = F - F_friction - F_wind;
    % F_move = F - F_roll - F_wind;
    F_wind_matrix = zeros(size(t));
    F_roll_matrix = zeros(size(t));
    F_move_matrix = zeros(size(t));

    % 高さ情報・勾配（度）の格納
    z = zeros(size(t));
    pitch_angle = zeros(size(t));
    roll_angle = zeros(size(t));

    % ローバの位置（初期位置を原点としたルナテラス上の座標）
    vehicle_x = zeros(size(t));
    vehicle_x(1) = initial_x;
    vehicle_y = zeros(size(t));
    vehicle_y(1) = initial_y;

    for i = 1:length(t)-1
        h = t(i+1) - t(i);
        
        % XY平面における車両と点群とのユークリッド距離をベースとして車両の近傍点を抽出
        dx = orbit_x - vehicle_x(i);
        dy = orbit_y - vehicle_y(i);
        distance = sqrt(dx.^2 + dy.^2);
        [~, nearby_index] = sort(distance);
        nearby_index = nearby_index(1:num_nearby_points);
        % タイムステップごとの、ローバ近傍の点群座標を取得
        local_x = orbit_x(nearby_index);
        local_y = orbit_y(nearby_index);
        local_z = orbit_z(nearby_index);

        % ロール角の計算
        dx_L = x_tireL - vehicle_x(i);
        dy_L = y_tireL - (vehicle_y(i) + half_vehicle_width);
        distance_L = sqrt(dx_L.^2 + dy_L.^2);
        [~, index_L] = sort(distance_L);
        index_L = index_L(5);
        local_x_L = x_tireL(index_L);
        local_y_L = y_tireL(index_L);
        local_z_L = z_tireL(index_L);
        avg_local_zL = mean(local_z_L);

        dx_R = x_tireR - vehicle_x(i);
        dy_R = y_tireR - (vehicle_y(i) - half_vehicle_width);
        distance_R = sqrt(dx_R.^2 + dy_R.^2);
        [~, index_R] = sort(distance_R);
        index_R = index_R(5);
        local_x_R = x_tireR(index_R);
        local_y_R = y_tireR(index_R);
        local_z_R = z_tireR(index_R);
        avg_local_zR = mean(local_z_R);

        roll_angle_slope = (avg_local_zR - avg_local_zL) / vehicle_width; % 傾き.軸の向きでなく、正回転の向きがどちらか要確認
        roll_angle_rad = atan(roll_angle_slope);
        roll_angle_deg = roll_angle_rad * 180 / pi;
        roll_angle(i) = roll_angle_deg; % ロール角

        % 最小二乗法による線形回帰によって、近傍点から勾配（ピッチ角）を計算(ローバの方向を無視するために、逆回転した点群を使用)
        % 横軸をX軸に平行な座標値にするために、ローバを中心にオフセット・逆回転
        local_x_offset = local_x - vehicle_x(i);
        local_y_offset = local_y - vehicle_y(i);
        local_xy_rotation = [local_x_offset, local_y_offset] * rotation_matrix;
        local_x_rot = local_xy_rotation(:, 1);

        X_regression = [ones(length(local_x_rot), 1), local_x_rot];
        Y_regression = local_z;
        regression_coeffs = X_regression \ Y_regression;
        slope = regression_coeffs(2); % 傾き
        pitch_angle_rad = atan(slope); % -πから+πの範囲
        pitch_angle_deg = pitch_angle_rad * 180 / pi; % ラジアンから度に変換

        % 地面に平行・垂直な重力成分
        g_parallel = g * sin(pitch_angle_rad);
        g_vertical = g * cos(pitch_angle_rad);

        mg_parallel = m * g_parallel;
        mg_vertical = m * g_vertical;

        % 空気抵抗、転がり抵抗、作用力
        F_wind = 0.5 * Cd * A * rho * abs(v(i) - v_wind) * (v(i) - v_wind);
        F_roll = c * mg_vertical;
        F_move = F - F_roll - F_wind;

        F_wind_matrix(i) = F_wind;
        F_roll_matrix(i) = F_roll;
        F_move_matrix(i) = F_move;

        F_total(i) = F_move - mg_parallel;

        z(i) = mean(local_z) + airSignal_z; % 近傍点の平均値を高さとする
        pitch_angle(i) = pitch_angle_deg; % ピッチ角
        
        k1 = h*F_total(i)/m;
        k2 = h*(F - F_roll - (0.5 * Cd * A * rho * abs(v(i) + k1/2 - v_wind) * (v(i) + k1/2 - v_wind)) - mg_parallel)/m;
        k3 = h*(F - F_roll - (0.5 * Cd * A * rho * abs(v(i) + k2/2 - v_wind) * (v(i) + k2/2 - v_wind)) - mg_parallel)/m;
        k4 = h*(F - F_roll - (0.5 * Cd * A * rho * abs(v(i) + k3 - v_wind) * (v(i) + k3 - v_wind)) - mg_parallel)/m;
        v(i+1) = v(i) + (k1 + 2*k2 + 2*k3 + k4)/6;

        % Unityでは左手座標系で、y座標値のsin角はxと逆回転
        % ※ roverRot_radは元の角度を負にした角で、Unity上でのy軸方向と、「回転Y」が正の時の方向を注意する必要
        x(i+1) = x(i) + v(i+1)*h*cos(-roverRot_radian);
        y(i+1) = y(i) + v(i+1)*h*sin(roverRot_radian);

        angle_v(i+1) = v(i+1) / r;
        v_translation(i+1) = v(i) + (k1 + 2*k2 + 2*k3 + k4)/6;

        % ローバの位置を更新
        vehicle_x(i+1) = vehicle_x(i) + v(i+1)*h*cos(-roverRot_radian);
        vehicle_y(i+1) = vehicle_y(i) + v(i+1)*h*sin(roverRot_radian);
    end
end
