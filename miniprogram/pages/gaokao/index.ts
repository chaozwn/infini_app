import { ensureAuth } from '../../utils/auth'
import { request } from '../../utils/request'
import { SHARE_PATH, SHARE_TITLE } from '../../config'

const provinceOptions = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏',
  '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西',
  '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏',
  '新疆', '香港', '澳门', '台湾',
]
const trackOptions = ['物理/理科', '历史/文科', '综合改革', '物理类', '历史类', '理科', '文科']
const batchOptions = ['本科批', '特殊类型', '提前批', '专科批', '一段', '二段']
const riskOptions = ['稳妥为主', '冲一冲', '保专业', '学校优先', '低风险']
const priorityOptions = ['冲稳保梯度', '学校优先', '专业优先', '城市优先', '就业优先', '保研读研', '学费住宿', '离家距离']
const DEFAULT_PRIORITIES = ['冲稳保梯度', '专业优先', '就业优先']

function buildPriorityList(selected: string[]) {
  return priorityOptions.map(name => ({ name, active: selected.indexOf(name) > -1 }))
}

interface ExampleItem {
  province: string
  track: string
  score: string
  rank: string
  targetSchool: string
  targetMajor: string
  cityPreference: string
  notes: string
}

const examples: ExampleItem[] = [
  {
    province: '河南', track: '物理/理科', score: '610', rank: '18000',
    targetSchool: '西安电子科技大学', targetMajor: '计算机、电子信息、人工智能',
    cityPreference: '西安、武汉、南京、成都都可以',
    notes: '想判断目标学校能不能冲，顺便给稳妥和保底方案。',
  },
  {
    province: '浙江', track: '综合改革', score: '638', rank: '14500',
    targetSchool: '浙江大学', targetMajor: '工科试验班、信息类、临床医学',
    cityPreference: '优先杭州，也接受上海和南京',
    notes: '家里更看重学校层次，但不想被调剂到完全不适合的专业。',
  },
  {
    province: '四川', track: '历史/文科', score: '575', rank: '4200',
    targetSchool: '四川大学、西南财经大学', targetMajor: '法学、经济学、新闻传播',
    cityPreference: '成都优先',
    notes: '希望稳一点，重点看专业前景和录取风险。',
  },
]

interface PickerEvent {
  detail: { value: string }
  currentTarget: { dataset: { field: string; options: string } }
}
interface InputEvent {
  detail: { value: string }
  currentTarget: { dataset: { field: string } }
}
interface TagEvent {
  currentTarget: { dataset: { name: string } }
}
interface ExampleEvent {
  currentTarget: { dataset: { index: number } }
}

Page({
  data: {
    provinceOptions,
    trackOptions,
    batchOptions,
    riskOptions,
    priorityOptions,
    examples,
    form: {
      province: '',
      examYear: '2026',
      track: '',
      score: '',
      rank: '',
      batch: '',
      targetSchool: '',
      targetMajor: '',
      cityPreference: '',
      familyConstraints: '',
      riskLevel: '稳妥为主',
      notes: '',
    },
    provinceIndex: -1,
    trackIndex: -1,
    batchIndex: -1,
    riskIndex: riskOptions.indexOf('稳妥为主'),
    priorityList: buildPriorityList(DEFAULT_PRIORITIES),
    submitting: false,
  },

  onShow() {
    ensureAuth()
    wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
  },

  onShareAppMessage() {
    return { title: SHARE_TITLE, path: SHARE_PATH }
  },

  onShareTimeline() {
    return { title: SHARE_TITLE }
  },

  onInput(e: InputEvent) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onPickerChange(e: PickerEvent) {
    const field = e.currentTarget.dataset.field
    const optionsKey = e.currentTarget.dataset.options
    const idx = Number(e.detail.value)
    const opts = (this.data as unknown as Record<string, string[]>)[optionsKey] || []
    this.setData({
      [`form.${field}`]: opts[idx] || '',
      [`${field}Index`]: idx,
    })
  },

  onTogglePriority(e: TagEvent) {
    const name = e.currentTarget.dataset.name
    const priorityList = this.data.priorityList.map(item =>
      item.name === name ? { name: item.name, active: !item.active } : item,
    )
    this.setData({ priorityList })
  },

  applyExample(e: ExampleEvent) {
    const ex = examples[e.currentTarget.dataset.index]
    if (!ex) return
    this.setData({
      'form.province': ex.province,
      'form.track': ex.track,
      'form.score': ex.score,
      'form.rank': ex.rank,
      'form.targetSchool': ex.targetSchool,
      'form.targetMajor': ex.targetMajor,
      'form.cityPreference': ex.cityPreference,
      'form.notes': ex.notes,
      provinceIndex: provinceOptions.indexOf(ex.province),
      trackIndex: trackOptions.indexOf(ex.track),
      priorityList: buildPriorityList(DEFAULT_PRIORITIES),
    })
  },

  async onSubmit() {
    const { form, submitting } = this.data
    const priorities = this.data.priorityList.filter(item => item.active).map(item => item.name)
    if (submitting) return
    if (!form.province.trim()) {
      wx.showToast({ title: '请选择考生省份', icon: 'none' })
      return
    }
    if (!form.score.trim() && !form.rank.trim() && !form.targetSchool.trim()) {
      wx.showToast({ title: '请填写分数、位次或目标学校', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      // 兜底：启动时静默登录失败（如网络抖动）则在提交前重试
      const ok = await ensureAuth()
      if (!ok) {
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        return
      }
      const res = await request<{ recordId: string; status: string }>({
        url: '/api/mini/gaokao/submit',
        method: 'POST',
        data: { ...form, priorities },
      })
      wx.navigateTo({ url: `/pages/gaokao/result?id=${res.recordId}` })
    } catch (err) {
      wx.showToast({ title: (err as Error).message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },
})
