function [x, y, z] = offset_rotate_pointcloud(file_path)
% .txt形式のルナテラス点群データを対空標識を原点としたオフセット・回転させて.txtで保存する関数

    % ファイルを読み込む
    point_cloud_data = readmatrix(file_path);

    % XYZ座標値を抽出
    x = point_cloud_data(:, 1);
    y = point_cloud_data(:, 2);
    z = point_cloud_data(:, 3);

    % 原点のオフセット
    offset_x = -51348.044;
    offset_y = -11134.957;
    offset_z = 26.113;
    
    x = x - offset_x;
    y = y - offset_y;
    z = z - offset_z;
    
    % 点群の回転（反時計回りに65度）
    angle_rad = 65 * pi / 180;
    rot_matrix = [cos(angle_rad), -sin(angle_rad); sin(angle_rad), cos(angle_rad)];
    rotated_coords = [x, y] * rot_matrix;
    x = rotated_coords(:, 1);
    y = rotated_coords(:, 2);

    % ※点群が反転している場合のみ　Y座標の正負を逆転させる
    y = -y;

    % 点群データをテキスト形式で保存
    output_file = 'pointcloud_all_area.txt';
    data = [x, y, z];
    writematrix(data, output_file, 'Delimiter', ' ');
    fprintf('点群データが %s に保存されました。\n', output_file);

end
