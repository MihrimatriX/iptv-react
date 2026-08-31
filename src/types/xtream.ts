export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: string;
  direct_source?: string;
}

export interface XtreamStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon?: string;
  epg_channel_id?: string;
  category_id: string;
  custom_sid?: string;
  tv_archive_duration?: number;
  added?: string;
}

export interface ChannelStream {
  id: number;
  name: string;
  streamType: string;
  streamIcon: string | null;
  streamUrl: string;
  added?: string;
}

export interface ChannelCategory {
  id: string;
  name: string;
  order: number;
  parentId: string;
  streams: ChannelStream[];
}
