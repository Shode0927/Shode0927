function [x, y, z] = read_pointcloud(file_path)
    % .txt形式の点群データからXYZ座標値を抽出する関数

    % ファイルを読み込む
    point_cloud_data = readmatrix(file_path);

    % XYZ座標値を抽出
    x = point_cloud_data(:, 1);
    y = point_cloud_data(:, 2);
    z = point_cloud_data(:, 3);
end
