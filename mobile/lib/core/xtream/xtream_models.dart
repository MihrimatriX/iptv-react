class ChannelStream {
  const ChannelStream({
    required this.id,
    required this.name,
    required this.streamType,
    required this.streamUrl,
    this.streamIcon,
    this.added,
    this.categoryId,
  });

  final int id;
  final String name;
  final String streamType;
  final String streamUrl;
  final String? streamIcon;
  final String? added;
  final String? categoryId;

  factory ChannelStream.fromJson(Map<String, dynamic> json) {
    return ChannelStream(
      id: json['id'] as int,
      name: json['name'] as String,
      streamType: json['streamType'] as String? ?? 'live',
      streamUrl: json['streamUrl'] as String,
      streamIcon: json['streamIcon'] as String?,
      added: json['added'] as String?,
      categoryId: json['categoryId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'streamType': streamType,
        'streamUrl': streamUrl,
        'streamIcon': streamIcon,
        'added': added,
        'categoryId': categoryId,
      };
}

class ChannelCategory {
  const ChannelCategory({
    required this.id,
    required this.name,
    required this.order,
    required this.parentId,
    required this.streams,
  });

  final String id;
  final String name;
  final int order;
  final String parentId;
  final List<ChannelStream> streams;

  factory ChannelCategory.fromJson(Map<String, dynamic> json) {
    return ChannelCategory(
      id: json['id'] as String,
      name: json['name'] as String,
      order: json['order'] as int? ?? 0,
      parentId: json['parentId'] as String? ?? '0',
      streams: (json['streams'] as List<dynamic>? ?? [])
          .map((e) => ChannelStream.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'order': order,
        'parentId': parentId,
        'streams': streams.map((s) => s.toJson()).toList(),
      };
}

class XtreamCategoryRaw {
  const XtreamCategoryRaw({
    required this.categoryId,
    required this.categoryName,
    required this.parentId,
  });

  final String categoryId;
  final String categoryName;
  final String parentId;

  factory XtreamCategoryRaw.fromJson(Map<String, dynamic> json) {
    return XtreamCategoryRaw(
      categoryId: '${json['category_id']}',
      categoryName: '${json['category_name'] ?? ''}',
      parentId: '${json['parent_id'] ?? '0'}',
    );
  }
}

class XtreamStreamRaw {
  const XtreamStreamRaw({
    required this.streamId,
    required this.name,
    required this.streamType,
    required this.categoryId,
    this.streamIcon,
    this.added,
  });

  final int streamId;
  final String name;
  final String streamType;
  final String categoryId;
  final String? streamIcon;
  final String? added;

  factory XtreamStreamRaw.fromJson(Map<String, dynamic> json) {
    final id = json['stream_id'];
    return XtreamStreamRaw(
      streamId: id is int ? id : int.tryParse('$id') ?? 0,
      name: '${json['name'] ?? ''}',
      streamType: '${json['stream_type'] ?? 'live'}',
      categoryId: '${json['category_id'] ?? ''}',
      streamIcon: json['stream_icon']?.toString(),
      added: json['added']?.toString(),
    );
  }
}
