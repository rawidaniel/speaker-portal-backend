export interface PaginatedResult<T> {
  data: T[]
  payload: {
    pagination: {
      page: number
      itemsPerPage: number
      links?: Array<{
        label: string
        active: boolean
        url: string | null
        page: number | null
      }>
      total: number
      lastPage: number
      prev: number | null
      next: number | null
    }
  }
}

export type PaginateOptions = {
  page?: number | string
  itemsPerPage?: number | string
}
export type PaginateFunction = <T, K>(
  model: any,
  options?: PaginateOptions,
  args?: K,
) => Promise<PaginatedResult<T>>

export const paginator = (
  defaultOptions: PaginateOptions,
): PaginateFunction => {
  return async (
    model,
    options,
    args: any = { where: undefined, include: undefined },
  ) => {
    const page = Number(options?.page || defaultOptions?.page) || 1
    const itemsPerPage =
      Number(options?.itemsPerPage || defaultOptions?.itemsPerPage) || 10

    const skip = page > 0 ? itemsPerPage * (page - 1) : 0
    const [total, data] = await Promise.all([
      model.count({ where: args.where }),
      model.findMany({
        ...args,
        take: itemsPerPage,
        skip,
      }),
    ])
    const lastPage = Math.ceil(total / itemsPerPage)
    const links: Array<{
      label: string
      active: boolean
      url: string | null
      page: number | null
    }> = []
    for (let index = 1; index <= lastPage; index += 1) {
      links.push({ label: `${index}`, active: false, url: null, page: index })
    }

    return {
      data,
      payload: {
        pagination: {
          page,
          itemsPerPage,
          links,
          total,
          lastPage,
          prev: page > 1 ? page - 1 : null,
          next: page < lastPage ? page + 1 : null,
        },
      },
    }
  }
}
